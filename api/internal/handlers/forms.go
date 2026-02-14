package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"api/internal/email"
	"api/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

type FormHandler struct {
	pool *pgxpool.Pool
}

func NewFormHandler(pool *pgxpool.Pool) *FormHandler {
	return &FormHandler{pool: pool}
}

// HandleSubmission handles form submissions
func (h *FormHandler) HandleSubmission(c *gin.Context) {
	startTime := time.Now()
	formID := c.Param("formId")

	// Create SQLC queries instance - use pool directly for now
	// queries := db.New(h.pool)

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Step 1: Get form context (single query for all data)
	log.Info().Str("form_id", formID).Msg("Fetching form context")

	var formCtx struct {
		FormID                   string
		FormName                 string
		FormIsActive             bool
		AllowFileUploads         bool
		MaxFileCount             *int32
		MaxFileSize              *int32
		AllowedFileTypes         *string
		SpamCheckEnabled         bool
		HoneypotFieldName        *string
		WebhookUrl               *string
		SendEmailNotifications   bool
		NotificationEmails       *string
		ResponseType             string
		RedirectUrl              *string
		SuccessMessage           *string
		OrganizationID           string
		OrganizationName         string
		OrganizationLogo         *string
		OrganizationIsPaused     bool
		UsedStorageMb            int32
		SubmissionsThisMonth     int32
		TotalSubmissions         int32
		MaxSubmissionsPerMonth   int32
		MaxStorageMb             int32
		SubscriptionStatus       string
		SubscriptionTier         string
	}

	// Query form context (column names are camelCase from Drizzle schema)
	err := h.pool.QueryRow(ctx, `
		SELECT
			f.id as form_id,
			f.name as form_name,
			f."isActive" as form_is_active,
			f."allowFileUploads",
			f."maxFileCount",
			f."maxFileSize",
			f."allowedFileTypes",
			f."spamCheckEnabled",
			f."honeypotFieldName",
			f."webhookUrl",
			f."sendEmailNotifications",
			f."notificationEmails",
			f."responseType",
			f."redirectUrl",
			f."successMessage",
			o.id as organization_id,
			o.name as organization_name,
			o.logo as organization_logo,
			o."isPaused" as organization_is_paused,
			COALESCE(ru."usedStorageMb", 0) as used_storage_mb,
			COALESCE(ru."submissionsThisMonth", 0) as submissions_this_month,
			COALESCE(ru."totalSubmissions", 0) as total_submissions,
			s."maxSubmissionsPerMonth",
			s."maxStorageMb",
			s.status as subscription_status,
			s.tier as subscription_tier
		FROM form f
		INNER JOIN organization o ON f."organizationId" = o.id
		LEFT JOIN "spaceResourceUsage" ru ON ru."organizationId" = o.id
		INNER JOIN member m ON m."organizationId" = o.id
		INNER JOIN subscription s ON s."userId" = m."userId"
		WHERE f.id = $1
		LIMIT 1
	`, formID).Scan(
		&formCtx.FormID,
		&formCtx.FormName,
		&formCtx.FormIsActive,
		&formCtx.AllowFileUploads,
		&formCtx.MaxFileCount,
		&formCtx.MaxFileSize,
		&formCtx.AllowedFileTypes,
		&formCtx.SpamCheckEnabled,
		&formCtx.HoneypotFieldName,
		&formCtx.WebhookUrl,
		&formCtx.SendEmailNotifications,
		&formCtx.NotificationEmails,
		&formCtx.ResponseType,
		&formCtx.RedirectUrl,
		&formCtx.SuccessMessage,
		&formCtx.OrganizationID,
		&formCtx.OrganizationName,
		&formCtx.OrganizationLogo,
		&formCtx.OrganizationIsPaused,
		&formCtx.UsedStorageMb,
		&formCtx.SubmissionsThisMonth,
		&formCtx.TotalSubmissions,
		&formCtx.MaxSubmissionsPerMonth,
		&formCtx.MaxStorageMb,
		&formCtx.SubscriptionStatus,
		&formCtx.SubscriptionTier,
	)

	if err != nil {
		log.Error().Err(err).Str("form_id", formID).Msg("Form not found")
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "FORM_NOT_FOUND",
			"message": "Form not found",
		})
		return
	}

	// Step 2: In-memory validations
	if !formCtx.FormIsActive {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "FORM_INACTIVE",
			"message": "This form is no longer accepting submissions",
		})
		return
	}

	if formCtx.OrganizationIsPaused {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "SPACE_PAUSED",
			"message": "This form is temporarily unavailable",
		})
		return
	}

	if formCtx.SubscriptionStatus != "active" {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "SUBSCRIPTION_INACTIVE",
			"message": "This form is temporarily unavailable",
		})
		return
	}

	// Step 3: Parse form data (support both JSON and multipart)
	var formData map[string]interface{}
	var files []*storage.UploadedFile

	contentType := c.GetHeader("Content-Type")

	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Parse multipart form
		if err := c.Request.ParseMultipartForm(32 << 20); err != nil { // 32MB max
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "INVALID_REQUEST",
				"message": "Invalid form data",
			})
			return
		}

		// Extract form fields
		formData = make(map[string]interface{})
		for key, values := range c.Request.MultipartForm.Value {
			if len(values) == 1 {
				formData[key] = values[0]
			} else {
				formData[key] = values
			}
		}
	} else {
		// Parse JSON
		if err := c.ShouldBindJSON(&formData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "INVALID_REQUEST",
				"message": "Invalid form data",
			})
			return
		}
	}

	// Step 3.5: Validate form data to prevent abuse (schemaless attack protection)
	const (
		MaxFields       = 100           // Max number of fields per submission
		MaxFieldSize    = 64 * 1024     // 64KB max per field value
		MaxTotalPayload = 1 * 1024 * 1024 // 1MB total for form data (excluding files)
	)

	if len(formData) > MaxFields {
		log.Warn().
			Str("form_id", formID).
			Int("field_count", len(formData)).
			Msg("Submission rejected: too many fields")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Too many fields in submission",
		})
		return
	}

	var totalPayloadSize int
	for key, value := range formData {
		valueStr := fmt.Sprintf("%v", value)
		if len(valueStr) > MaxFieldSize {
			log.Warn().
				Str("form_id", formID).
				Str("field", key).
				Int("size", len(valueStr)).
				Msg("Submission rejected: field too large")
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   "Field value exceeds maximum size",
			})
			return
		}
		totalPayloadSize += len(key) + len(valueStr)
	}

	if totalPayloadSize > MaxTotalPayload {
		log.Warn().
			Str("form_id", formID).
			Int("payload_size", totalPayloadSize).
			Msg("Submission rejected: payload too large")
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Form data exceeds maximum size",
		})
		return
	}

	// Step 4: Spam detection (BEFORE file upload and DB save)
	isSpam := false
	spamReason := ""

	// Check honeypot field
	if formCtx.SpamCheckEnabled && formCtx.HoneypotFieldName != nil {
		if honeypotValue, exists := formData[*formCtx.HoneypotFieldName]; exists && honeypotValue != "" {
			isSpam = true
			spamReason = "honeypot_filled"
			log.Info().Str("form_id", formID).Msg("Spam detected: honeypot filled")
		}
	}

	// Check if IP is marked as spam (from middleware)
	if isSpamIP, exists := c.Get("is_spam_ip"); exists && isSpamIP.(bool) {
		isSpam = true
		if reason, exists := c.Get("spam_reason"); exists {
			spamReason = reason.(string)
		}
		log.Info().Str("form_id", formID).Str("ip", c.ClientIP()).Msg("Spam detected: IP blocklist")
	}

	// Step 5: Log spam detection (but continue to save it for review)
	if isSpam {
		log.Info().
			Str("form_id", formID).
			Str("spam_reason", spamReason).
			Str("ip", c.ClientIP()).
			Msg("Spam detected - will save for review")
	}

	// Step 6: Check subscription limits (only for non-spam submissions)
	// Spam submissions don't count toward limits
	if !isSpam && formCtx.SubmissionsThisMonth >= formCtx.MaxSubmissionsPerMonth {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "SUBMISSION_LIMIT_REACHED",
			"message": "Monthly submission limit reached",
		})
		return
	}

	// Step 7: Generate submission ID and upload files (if any)
	submissionID := uuid.New().String()
	submittedAt := time.Now().UTC() // Use UTC for consistent timestamps

	// Handle file uploads (skip for spam to avoid wasting storage)
	if !isSpam && formCtx.AllowFileUploads && c.Request.MultipartForm != nil && len(c.Request.MultipartForm.File) > 0 {
		// Get storage client
		storageClient, err := storage.GetStorageClient(formCtx.OrganizationID)
		if err != nil {
			log.Error().Err(err).Msg("Failed to get storage client")
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "INTERNAL_ERROR",
			})
			return
		}

		// Build validation config
		var maxFileSize int64 = 2 * 1024 * 1024 // 2MB default
		maxFileCount := 3                       // default
		var allowedTypes []string

		if formCtx.MaxFileSize != nil {
			maxFileSize = int64(*formCtx.MaxFileSize)
		}
		if formCtx.MaxFileCount != nil {
			maxFileCount = int(*formCtx.MaxFileCount)
		}
		if formCtx.AllowedFileTypes != nil {
			json.Unmarshal([]byte(*formCtx.AllowedFileTypes), &allowedTypes)
		}

		config := &storage.FileValidationConfig{
			MaxFileSize:      maxFileSize,
			MaxFileCount:     maxFileCount,
			AllowedMimeTypes: allowedTypes,
		}

		// Collect all files from the multipart form
		var fileHeaders []*multipart.FileHeader
		for _, fileList := range c.Request.MultipartForm.File {
			for _, fh := range fileList {
				fileHeaders = append(fileHeaders, fh)
			}
		}

		// Upload files
		if len(fileHeaders) > 0 {
			files, err = storageClient.UploadFiles(ctx, formID, submissionID, fileHeaders, config)
			if err != nil {
				log.Error().Err(err).Msg("Failed to upload files")
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "FILE_UPLOAD_FAILED",
					"message": err.Error(),
				})
				return
			}
		}
	}

	// Step 8: Create submission
	// Marshal form data to JSON
	formDataJSON, err := json.Marshal(formData)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal form data")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "INTERNAL_ERROR",
		})
		return
	}

	// Marshal files to JSON (if any)
	var filesJSON []byte
	if len(files) > 0 {
		filesJSON, _ = json.Marshal(files)
	}

	// Extract email and name if present
	var submitterEmail, submitterName *string
	if emailVal, ok := formData["email"].(string); ok && emailVal != "" {
		submitterEmail = &emailVal
	}
	if nameVal, ok := formData["name"].(string); ok && nameVal != "" {
		submitterName = &nameVal
	}

	// Start transaction
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to start transaction")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "INTERNAL_ERROR",
		})
		return
	}
	defer tx.Rollback(ctx)

	// Insert submission (column names are camelCase from Drizzle schema)
	_, err = tx.Exec(ctx, `
		INSERT INTO submission (
			id, "formId", email, name, status, "isRead", "isClosed",
			data, files, "ipAddress", "userAgent", referer, "isSpam", "spamReason",
			"createdAt", "updatedAt"
		) VALUES (
			$1, $2, $3, $4, 'new', false, false, $5, $6, $7, $8, $9, $10, $11,
			$12, $12
		)
	`, submissionID, formID, submitterEmail, submitterName, formDataJSON, filesJSON,
		c.ClientIP(), c.GetHeader("User-Agent"), c.GetHeader("Referer"), isSpam, spamReason, submittedAt)

	if err != nil {
		log.Error().Err(err).Msg("Failed to create submission")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "INTERNAL_ERROR",
		})
		return
	}

	// Step 9: Increment counters (only for non-spam submissions)
	if !isSpam {
		_, err = tx.Exec(ctx, `
			UPDATE "spaceResourceUsage"
			SET
				"submissionsThisMonth" = "submissionsThisMonth" + 1,
				"totalSubmissions" = "totalSubmissions" + 1,
				"updatedAt" = NOW()
			WHERE "organizationId" = $1
		`, formCtx.OrganizationID)

		if err != nil {
			log.Error().Err(err).Msg("Failed to increment counters")
			// Don't fail the request, just log the error
		}
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		log.Error().Err(err).Msg("Failed to commit transaction")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "INTERNAL_ERROR",
		})
		return
	}

	// Log successful submission
	elapsed := time.Since(startTime).Milliseconds()
	log.Info().
		Str("form_id", formID).
		Str("submission_id", submissionID).
		Int("file_count", len(files)).
		Bool("is_spam", isSpam).
		Int64("processing_time_ms", elapsed).
		Msg("Submission processed")

	// Step 10: Send email notification (async) - skip for spam
	if !isSpam && formCtx.SendEmailNotifications && formCtx.NotificationEmails != nil {
		go h.sendNotificationEmail(formCtx, submissionID, formData, files, submittedAt)
	}

	// Step 11: Send response
	if formCtx.ResponseType == "redirect" && formCtx.RedirectUrl != nil {
		c.Redirect(http.StatusFound, *formCtx.RedirectUrl)
		return
	}

	// JSON response
	successMessage := "Thank you! Your submission has been received."
	if formCtx.SuccessMessage != nil {
		successMessage = *formCtx.SuccessMessage
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       successMessage,
		"submission_id": submissionID,
	})
}


// sendNotificationEmail sends the notification email asynchronously
func (h *FormHandler) sendNotificationEmail(
	formCtx struct {
		FormID                   string
		FormName                 string
		FormIsActive             bool
		AllowFileUploads         bool
		MaxFileCount             *int32
		MaxFileSize              *int32
		AllowedFileTypes         *string
		SpamCheckEnabled         bool
		HoneypotFieldName        *string
		WebhookUrl               *string
		SendEmailNotifications   bool
		NotificationEmails       *string
		ResponseType             string
		RedirectUrl              *string
		SuccessMessage           *string
		OrganizationID           string
		OrganizationName         string
		OrganizationLogo         *string
		OrganizationIsPaused     bool
		UsedStorageMb            int32
		SubmissionsThisMonth     int32
		TotalSubmissions         int32
		MaxSubmissionsPerMonth   int32
		MaxStorageMb             int32
		SubscriptionStatus       string
		SubscriptionTier         string
	},
	submissionID string,
	formData map[string]interface{},
	files []*storage.UploadedFile,
	submittedAt time.Time,
) {
	// Parse notification emails
	var recipients []string
	if err := json.Unmarshal([]byte(*formCtx.NotificationEmails), &recipients); err != nil {
		// Try comma-separated format
		recipients = strings.Split(*formCtx.NotificationEmails, ",")
		for i := range recipients {
			recipients[i] = strings.TrimSpace(recipients[i])
		}
	}

	// Filter empty recipients
	var validRecipients []string
	for _, r := range recipients {
		if r != "" {
			validRecipients = append(validRecipients, r)
		}
	}

	if len(validRecipients) == 0 {
		return
	}

	// Get email client
	emailClient, err := email.GetEmailClient()
	if err != nil {
		log.Error().Err(err).Msg("Failed to get email client")
		return
	}

	// Build file attachments
	var fileAttachments []email.FileAttachment
	for _, f := range files {
		fileAttachments = append(fileAttachments, email.FileAttachment{
			Name: f.Name,
			URL:  f.URL,
			Size: f.Size,
		})
	}

	// Build notification data
	spaceLogo := ""
	if formCtx.OrganizationLogo != nil {
		spaceLogo = *formCtx.OrganizationLogo
	}

	notificationData := &email.SubmissionNotificationData{
		FormID:           formCtx.FormID,
		FormName:         formCtx.FormName,
		SubmissionID:     submissionID,
		SpaceID:          formCtx.OrganizationID,
		SpaceName:        formCtx.OrganizationName,
		SpaceLogo:        spaceLogo,
		SubscriptionTier: formCtx.SubscriptionTier,
		FormData:         formData,
		Files:            fileAttachments,
		SubmittedAt:      submittedAt,
	}

	// Send email
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := emailClient.SendSubmissionNotification(ctx, validRecipients, notificationData); err != nil {
		log.Error().Err(err).
			Str("form_id", formCtx.FormID).
			Str("submission_id", submissionID).
			Msg("Failed to send notification email")
		return
	}

	// Update submission with email sent status
	_, err = h.pool.Exec(ctx, `
		UPDATE submission
		SET "emailSent" = true, "emailSentAt" = NOW(), "updatedAt" = NOW()
		WHERE id = $1
	`, submissionID)

	if err != nil {
		log.Warn().Err(err).Str("submission_id", submissionID).Msg("Failed to update emailSent status")
	}
}
