package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"api/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMain sets up test environment
func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load("../../../.env")
	os.Exit(m.Run())
}

// testDB holds test database connection and helper methods
type testDB struct {
	pool       *pgxpool.Pool
	platformDB *database.PlatformDB
	formID     string
	orgID      string
	userID     string
	cleanupFn  func()
}

// setupTestDB creates a test database with fixtures for the BYOI flow.
// Creates: user, organization, formEndpoint, connection, form (in platform DB for free trial testing).
func setupTestDB(t *testing.T) *testDB {
	t.Helper()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set, skipping integration tests")
	}

	// Also need PLATFORM_DATABASE_URL (can be same as DATABASE_URL for tests)
	if os.Getenv("PLATFORM_DATABASE_URL") == "" {
		os.Setenv("PLATFORM_DATABASE_URL", databaseURL)
	}

	// Need ENCRYPTION_KEY for crypto operations
	if os.Getenv("ENCRYPTION_KEY") == "" {
		os.Setenv("ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	require.NoError(t, err)

	ctx := context.Background()

	orgID := uuid.New().String()
	userID := uuid.New().String()
	formID := uuid.New().String()

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)

	// Insert test user
	_, err = tx.Exec(ctx, `
		INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
		VALUES ($1, 'test@example.com', 'Test User', true, NOW(), NOW())
	`, userID)
	require.NoError(t, err)

	// Insert test organization
	_, err = tx.Exec(ctx, `
		INSERT INTO organization (id, name, "createdBy", "createdAt", "updatedAt")
		VALUES ($1, 'Test Org', $2, NOW(), NOW())
	`, orgID, userID)
	require.NoError(t, err)

	// Insert member relationship
	_, err = tx.Exec(ctx, `
		INSERT INTO member (id, "userId", "organizationId", role, "createdAt", "updatedAt")
		VALUES ($1, $2, $3, 'owner', NOW(), NOW())
	`, uuid.New().String(), userID, orgID)
	require.NoError(t, err)

	// Insert formEndpoint (routing entry for Go API)
	_, err = tx.Exec(ctx, `
		INSERT INTO "formEndpoint" (id, "formId", "userId", "organizationId", "isActive", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, true, NOW(), NOW())
	`, uuid.New().String(), formID, userID, orgID)
	require.NoError(t, err)

	// Insert form (in platform DB for free trial testing)
	_, err = tx.Exec(ctx, `
		INSERT INTO form (
			id, "organizationId", "createdBy", name, "isActive", "allowFileUploads",
			"maxFileCount", "maxFileSize", "allowedFileTypes",
			"spamCheckEnabled", "honeypotFieldName",
			"responseType", "successMessage",
			"createdAt", "updatedAt"
		) VALUES (
			$1, $2, $3, 'Test Form', true, false,
			3, 10485760, 'image/png,image/jpeg,application/pdf',
			true, 'website',
			'json', 'Thank you for your submission!',
			NOW(), NOW()
		)
	`, formID, orgID, userID)
	require.NoError(t, err)

	err = tx.Commit(ctx)
	require.NoError(t, err)

	// Create PlatformDB instance (uses PLATFORM_DATABASE_URL)
	platformDB := database.NewPlatformDB()

	cleanup := func() {
		pool.Exec(context.Background(), `DELETE FROM submission WHERE "formId" = $1`, formID)
		pool.Exec(context.Background(), `DELETE FROM form WHERE id = $1`, formID)
		pool.Exec(context.Background(), `DELETE FROM "formEndpoint" WHERE "formId" = $1`, formID)
		pool.Exec(context.Background(), `DELETE FROM "connection" WHERE "userId" = $1`, userID)
		pool.Exec(context.Background(), `DELETE FROM member WHERE "organizationId" = $1`, orgID)
		pool.Exec(context.Background(), `DELETE FROM "user" WHERE id = $1`, userID)
		pool.Exec(context.Background(), `DELETE FROM organization WHERE id = $1`, orgID)
		platformDB.Close()
		pool.Close()
	}

	return &testDB{
		pool:       pool,
		platformDB: platformDB,
		formID:     formID,
		orgID:      orgID,
		userID:     userID,
		cleanupFn:  cleanup,
	}
}

// TestFormSubmission_FreeTrial tests a successful submission for a free trial user
// (no connection record, falls back to platform DB)
func TestFormSubmission_FreeTrial(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.platformDB)

	formData := map[string]interface{}{
		"name":    "John Doe",
		"email":   "john@example.com",
		"message": "Test message",
	}
	body, _ := json.Marshal(formData)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	handler.HandleSubmission(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.True(t, response["success"].(bool))
	assert.NotEmpty(t, response["submission_id"])
	assert.Equal(t, "Thank you for your submission!", response["message"])

	// Verify submission was created in database
	var count int
	err = db.pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM submission WHERE "formId" = $1 AND "isSpam" = false`,
		db.formID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

// TestFormSubmission_SpamHoneypot tests honeypot spam detection
func TestFormSubmission_SpamHoneypot(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.platformDB)

	// Create request with honeypot field filled
	formData := map[string]interface{}{
		"name":    "Spammer",
		"email":   "spam@example.com",
		"website": "http://spam-site.com", // Honeypot field
	}
	body, _ := json.Marshal(formData)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	handler.HandleSubmission(c)

	// Should still return success (to fool bots)
	assert.Equal(t, http.StatusOK, w.Code)

	// Verify submission was marked as spam
	var isSpam bool
	var spamReason string
	err := db.pool.QueryRow(context.Background(),
		`SELECT "isSpam", "spamReason" FROM submission WHERE "formId" = $1`,
		db.formID).Scan(&isSpam, &spamReason)
	require.NoError(t, err)
	assert.True(t, isSpam)
	assert.Equal(t, "honeypot_filled", spamReason)
}

// TestFormSubmission_SpamIPBlocklist tests IP blocklist spam detection
func TestFormSubmission_SpamIPBlocklist(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.platformDB)

	formData := map[string]interface{}{
		"name":  "Test User",
		"email": "test@example.com",
	}
	body, _ := json.Marshal(formData)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	// Set spam IP flag (middleware would do this)
	c.Set("is_spam_ip", true)
	c.Set("spam_reason", "ip_blocklist")

	handler.HandleSubmission(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify submission was marked as spam
	var isSpam bool
	var spamReason string
	err := db.pool.QueryRow(context.Background(),
		`SELECT "isSpam", "spamReason" FROM submission WHERE "formId" = $1`,
		db.formID).Scan(&isSpam, &spamReason)
	require.NoError(t, err)
	assert.True(t, isSpam)
	assert.Equal(t, "ip_blocklist", spamReason)
}

// TestFormSubmission_InactiveFormEndpoint tests inactive formEndpoint rejection
func TestFormSubmission_InactiveFormEndpoint(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	// Deactivate formEndpoint
	_, err := db.pool.Exec(context.Background(),
		`UPDATE "formEndpoint" SET "isActive" = false WHERE "formId" = $1`, db.formID)
	require.NoError(t, err)

	handler := NewFormHandler(db.platformDB)

	formData := map[string]interface{}{
		"name":  "Test",
		"email": "test@example.com",
	}
	body, _ := json.Marshal(formData)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	handler.HandleSubmission(c)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "FORM_INACTIVE", response["error"])
}

// TestFormSubmission_FreeTrialLimit tests the 50-submission cap for free trial
func TestFormSubmission_FreeTrialLimit(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.platformDB)

	// Insert 50 non-spam submissions to hit the limit
	for i := 0; i < 50; i++ {
		_, err := db.pool.Exec(context.Background(), `
			INSERT INTO submission (id, "formId", status, "isRead", "isClosed", data, "isSpam", "createdAt", "updatedAt")
			VALUES ($1, $2, 'new', false, false, '{}', false, NOW(), NOW())
		`, uuid.New().String(), db.formID)
		require.NoError(t, err)
	}

	formData := map[string]interface{}{
		"name":  "Test",
		"email": "test@example.com",
	}
	body, _ := json.Marshal(formData)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	handler.HandleSubmission(c)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "SUBMISSION_LIMIT_REACHED", response["error"])
}

// TestFormSubmission_FormNotFound tests non-existent form
func TestFormSubmission_FormNotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.platformDB)

	formData := map[string]interface{}{
		"name": "Test",
	}
	body, _ := json.Marshal(formData)

	fakeFormID := uuid.New().String()
	req := httptest.NewRequest("POST", "/forms/"+fakeFormID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: fakeFormID}}

	handler.HandleSubmission(c)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "FORM_NOT_FOUND", response["error"])
}

// TestFormSubmission_InvalidJSON tests malformed request
func TestFormSubmission_InvalidJSON(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.platformDB)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	handler.HandleSubmission(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "INVALID_REQUEST", response["error"])
}

// TestFormSubmission_ConcurrentSubmissions tests race conditions
func TestFormSubmission_ConcurrentSubmissions(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.platformDB)

	concurrentRequests := 10
	done := make(chan bool, concurrentRequests)

	for i := 0; i < concurrentRequests; i++ {
		go func(index int) {
			formData := map[string]interface{}{
				"name":  "User " + strconv.Itoa(index),
				"email": "user" + strconv.Itoa(index) + "@example.com",
			}
			body, _ := json.Marshal(formData)

			req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{{Key: "formId", Value: db.formID}}

			handler.HandleSubmission(c)

			assert.Equal(t, http.StatusOK, w.Code)
			done <- true
		}(i)
	}

	for i := 0; i < concurrentRequests; i++ {
		<-done
	}

	time.Sleep(100 * time.Millisecond)

	// Verify all submissions were created
	var count int
	err := db.pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM submission WHERE "formId" = $1`,
		db.formID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, concurrentRequests, count)
}

// TestFormSubmission_ExtractsEmailAndName tests data extraction
func TestFormSubmission_ExtractsEmailAndName(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.platformDB)

	formData := map[string]interface{}{
		"name":    "Jane Doe",
		"email":   "jane@example.com",
		"message": "Hello",
		"phone":   "555-1234",
	}
	body, _ := json.Marshal(formData)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	handler.HandleSubmission(c)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify email and name were extracted to dedicated columns
	var email, name string
	var data []byte
	err := db.pool.QueryRow(context.Background(),
		`SELECT email, name, data FROM submission WHERE "formId" = $1`,
		db.formID).Scan(&email, &name, &data)
	require.NoError(t, err)

	assert.Equal(t, "jane@example.com", email)
	assert.Equal(t, "Jane Doe", name)

	var dataMap map[string]interface{}
	json.Unmarshal(data, &dataMap)
	assert.Equal(t, "555-1234", dataMap["phone"])
}
