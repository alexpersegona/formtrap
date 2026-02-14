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

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMain sets up test environment
func TestMain(m *testing.M) {
	// Set gin to test mode
	gin.SetMode(gin.TestMode)

	// Load .env from project root (two directories up from internal/handlers)
	// Try multiple paths to find .env file
	_ = godotenv.Load("../../.env")     // From api/internal/handlers -> api/../../.env
	_ = godotenv.Load("../../../.env")  // Alternative path

	os.Exit(m.Run())
}

// testDB holds test database connection and helper methods
type testDB struct {
	pool      *pgxpool.Pool
	redis     *redis.Client
	formID    string
	orgID     string
	spaceID   string
	userID    string
	cleanupFn func()
}

// setupTestDB creates a test database with fixtures and returns cleanup function
func setupTestDB(t *testing.T) *testDB {
	t.Helper()

	// Connect to test database
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set, skipping integration tests")
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	require.NoError(t, err)

	// Connect to Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}
	opt, err := redis.ParseURL(redisURL)
	require.NoError(t, err)
	redisClient := redis.NewClient(opt)

	ctx := context.Background()

	// Create test data IDs
	orgID := uuid.New().String()
	userID := uuid.New().String()
	formID := uuid.New().String()

	// Start transaction for test data (will be rolled back)
	tx, err := pool.Begin(ctx)
	require.NoError(t, err)

	// Insert test user FIRST (required for organization.createdBy foreign key)
	_, err = tx.Exec(ctx, `
		INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
		VALUES ($1, 'test@example.com', 'Test User', true, NOW(), NOW())
	`, userID)
	require.NoError(t, err)

	// Insert test organization (with required createdBy field)
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

	// Insert subscription
	_, err = tx.Exec(ctx, `
		INSERT INTO subscription (
			id, "userId", status, "maxSubmissionsPerMonth", "maxStorageMb",
			"createdAt", "updatedAt"
		) VALUES ($1, $2, 'active', 1000, 1000, NOW(), NOW())
	`, uuid.New().String(), userID)
	require.NoError(t, err)

	// Insert space resource usage
	_, err = tx.Exec(ctx, `
		INSERT INTO "spaceResourceUsage" (
			id, "organizationId", "usedStorageMb", "submissionsThisMonth",
			"totalSubmissions", "activeMembers", "activeForms",
			"updatedAt"
		) VALUES ($1, $2, 0, 0, 0, 1, 1, NOW())
	`, uuid.New().String(), orgID)
	require.NoError(t, err)

	// Insert test form
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

	// Commit test data
	err = tx.Commit(ctx)
	require.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		// Clean up test data
		pool.Exec(context.Background(), `DELETE FROM submission WHERE "formId" = $1`, formID)
		pool.Exec(context.Background(), `DELETE FROM form WHERE id = $1`, formID)
		pool.Exec(context.Background(), `DELETE FROM "spaceResourceUsage" WHERE "organizationId" = $1`, orgID)
		pool.Exec(context.Background(), `DELETE FROM subscription WHERE "userId" = $1`, userID)
		pool.Exec(context.Background(), `DELETE FROM member WHERE "organizationId" = $1`, orgID)
		pool.Exec(context.Background(), `DELETE FROM "user" WHERE id = $1`, userID)
		pool.Exec(context.Background(), `DELETE FROM organization WHERE id = $1`, orgID)

		// Clean up Redis
		redisClient.FlushDB(context.Background())

		pool.Close()
		redisClient.Close()
	}

	return &testDB{
		pool:      pool,
		redis:     redisClient,
		formID:    formID,
		orgID:     orgID,
		userID:    userID,
		cleanupFn: cleanup,
	}
}

// TestFormSubmission_Success tests a successful form submission
func TestFormSubmission_Success(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.pool)

	// Create test request
	formData := map[string]interface{}{
		"name":    "John Doe",
		"email":   "john@example.com",
		"message": "Test message",
	}
	body, _ := json.Marshal(formData)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	// Create Gin context
	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	// Execute handler
	handler.HandleSubmission(c)

	// Assert response
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

	// Verify counters were incremented
	var submissionsThisMonth int32
	err = db.pool.QueryRow(context.Background(),
		`SELECT "submissionsThisMonth" FROM "spaceResourceUsage" WHERE "organizationId" = $1`,
		db.orgID).Scan(&submissionsThisMonth)
	require.NoError(t, err)
	assert.Equal(t, int32(1), submissionsThisMonth)
}

// TestFormSubmission_SpamHoneypot tests honeypot spam detection
func TestFormSubmission_SpamHoneypot(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.pool)

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

	// Verify counters were NOT incremented (spam doesn't count)
	var submissionsThisMonth int32
	err = db.pool.QueryRow(context.Background(),
		`SELECT "submissionsThisMonth" FROM "spaceResourceUsage" WHERE "organizationId" = $1`,
		db.orgID).Scan(&submissionsThisMonth)
	require.NoError(t, err)
	assert.Equal(t, int32(0), submissionsThisMonth, "Spam submissions should not increment counter")
}

// TestFormSubmission_SpamIPBlocklist tests IP blocklist spam detection
func TestFormSubmission_SpamIPBlocklist(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.pool)

	// Add IP to spam blocklist
	testIP := "192.168.1.100"
	err := db.redis.SAdd(context.Background(), "spam_ips", testIP).Err()
	require.NoError(t, err)

	formData := map[string]interface{}{
		"name":  "Test User",
		"email": "test@example.com",
	}
	body, _ := json.Marshal(formData)

	req := httptest.NewRequest("POST", "/forms/"+db.formID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = testIP + ":12345"
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "formId", Value: db.formID}}

	// Set spam IP flag (middleware would do this)
	c.Set("is_spam_ip", true)
	c.Set("spam_reason", "ip_blocklist")

	handler.HandleSubmission(c)

	// Should return success
	assert.Equal(t, http.StatusOK, w.Code)

	// Verify submission was marked as spam
	var isSpam bool
	var spamReason string
	err = db.pool.QueryRow(context.Background(),
		`SELECT "isSpam", "spamReason" FROM submission WHERE "formId" = $1`,
		db.formID).Scan(&isSpam, &spamReason)
	require.NoError(t, err)
	assert.True(t, isSpam)
	assert.Equal(t, "ip_blocklist", spamReason)
}

// TestFormSubmission_InactiveForm tests inactive form rejection
func TestFormSubmission_InactiveForm(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	// Deactivate form
	_, err := db.pool.Exec(context.Background(),
		`UPDATE form SET "isActive" = false WHERE id = $1`, db.formID)
	require.NoError(t, err)

	handler := NewFormHandler(db.pool)

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

	// Should reject with 403
	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "FORM_INACTIVE", response["error"])
}

// TestFormSubmission_SubmissionLimitReached tests quota enforcement
func TestFormSubmission_SubmissionLimitReached(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	// Set submissions to limit
	_, err := db.pool.Exec(context.Background(),
		`UPDATE "spaceResourceUsage" SET "submissionsThisMonth" = 1000 WHERE "organizationId" = $1`,
		db.orgID)
	require.NoError(t, err)

	handler := NewFormHandler(db.pool)

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

	// Should reject with 403
	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "SUBMISSION_LIMIT_REACHED", response["error"])
}

// TestFormSubmission_FormNotFound tests non-existent form
func TestFormSubmission_FormNotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.pool)

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

	handler := NewFormHandler(db.pool)

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

// TestFormSubmission_ConcurrentSubmissions tests race conditions with counters
func TestFormSubmission_ConcurrentSubmissions(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.pool)

	// Submit 10 concurrent requests
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

	// Wait for all to complete
	for i := 0; i < concurrentRequests; i++ {
		<-done
	}

	// Give database a moment to settle
	time.Sleep(100 * time.Millisecond)

	// Verify counter is exactly 10 (tests atomicity)
	var submissionsThisMonth int32
	err := db.pool.QueryRow(context.Background(),
		`SELECT "submissionsThisMonth" FROM "spaceResourceUsage" WHERE "organizationId" = $1`,
		db.orgID).Scan(&submissionsThisMonth)
	require.NoError(t, err)
	assert.Equal(t, int32(concurrentRequests), submissionsThisMonth, "Counter should be exactly equal to concurrent requests (tests atomic operations)")
}

// TestFormSubmission_ExtractsEmailAndName tests data extraction
func TestFormSubmission_ExtractsEmailAndName(t *testing.T) {
	db := setupTestDB(t)
	defer db.cleanupFn()

	handler := NewFormHandler(db.pool)

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

	// Verify full data is still stored as JSON
	var dataMap map[string]interface{}
	json.Unmarshal(data, &dataMap)
	assert.Equal(t, "555-1234", dataMap["phone"])
}
