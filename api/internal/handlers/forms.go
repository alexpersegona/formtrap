package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"api/internal/crypto"
	"api/internal/database"
	"api/internal/email"
	"api/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// FormHandler handles form submissions using per-user infrastructure.
type FormHandler struct {
	platformDB *database.PlatformDB
}

// NewFormHandler creates a new FormHandler with the platform database.
func NewFormHandler(platformDB *database.PlatformDB) *FormHandler {
	return &FormHandler{platformDB: platformDB}
}

// formConfig holds the form settings queried from the user's DB.
type formConfig struct {
	ID                     string
	Name                   string
	IsActive               bool
	AllowFileUploads       bool
	MaxFileCount           *int32
	MaxFileSize            *int32
	AllowedFileTypes       *string
	SpamCheckEnabled       bool
	HoneypotFieldName      *string
	WebhookUrl             *string
	SendEmailNotifications bool
	NotificationEmails     *string
	ResponseType           string
	RedirectUrl            *string
	SuccessMessage         *string
	OrganizationID         string
}

// HandleSubmission handles form submissions via the BYOI flow:
// 1. Look up formEndpoint from platform DB
// 2. Get user's connection credentials
// 3. Decrypt and connect to user's DB + storage
// 4. Query form config, validate, process submission
func (h *FormHandler) HandleSubmission(c *gin.Context) {
	startTime := time.Now()
	formID := c.Param("formId")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Step 1: Look up form endpoint from platform DB
	endpoint, err := h.platformDB.GetFormEndpoint(ctx, formID)
	if err != nil {
		log.Error().Err(err).Str("form_id", formID).Msg("Form endpoint not found")
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "FORM_NOT_FOUND",
			"message": "Form not found",
		})
		return
	}

	if !endpoint.IsActive {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "FORM_INACTIVE",
			"message": "This form is no longer accepting submissions",
		})
		return
	}

	// Step 2: Check if organization is paused
	isPaused, err := h.platformDB.IsOrganizationPaused(ctx, endpoint.OrganizationID)
	if err != nil {
		log.Error().Err(err).Str("org_id", endpoint.OrganizationID).Msg("Failed to check organization status")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "INTERNAL_ERROR"})
		return
	}
	if isPaused {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "SPACE_PAUSED",
			"message": "This form is temporarily unavailable",
		})
		return
	}

	// Step 3: Get user's connection credentials
	conn, err := h.platformDB.GetUserConnection(ctx, endpoint.UserID)
	// If no connection record exists, treat as free trial
	var isFreeTrial bool
	if err != nil {
		// No connection record = free trial user
		isFreeTrial = true
		conn = &database.UserConnection{UserID: endpoint.UserID}
		log.Debug().Str("user_id", endpoint.UserID).Msg("No connection record, using free trial mode")
	} else {
		isFreeTrial = conn.DBStatus != "connected" || !conn.SchemaInitialized
	}

	// Step 4-5: Get the appropriate DB pool
	// BYOI users: decrypt credentials and use their own DB
	// Free trial users: fall back to platform DB
	var userPool *pgxpool.Pool

	if isFreeTrial {
		// Free trial: use platform DB directly
		userPool = h.platformDB.GetPool()
		log.Debug().Str("user_id", endpoint.UserID).Msg("Using platform DB (free trial)")
	} else {
		// BYOI: decrypt and connect to user's DB
		dbConnString, err := crypto.Decrypt(conn.DBConnectionStringEncrypted)
		if err != nil {
			log.Error().Err(err).Str("user_id", endpoint.UserID).Msg("Failed to decrypt DB connection string")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "INTERNAL_ERROR"})
			return
		}

		userPoolMgr := database.GetUserPoolManager()
		userPool, err = userPoolMgr.GetPool(ctx, endpoint.UserID, dbConnString)
		if err != nil {
			log.Error().Err(err).Str("user_id", endpoint.UserID).Msg("Failed to get user DB pool")
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":   "DATABASE_ERROR",
				"message": "Unable to connect to form database",
			})
			return
		}
	}

	// Step 6: Query form config from user's DB
	formCfg, err := h.getFormConfig(ctx, userPool, formID)
	if err != nil {
		log.Error().Err(err).Str("form_id", formID).Msg("Form not found in user DB")
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "FORM_NOT_FOUND",
			"message": "Form not found",
		})
		return
	}

	if !formCfg.IsActive {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "FORM_INACTIVE",
			"message": "This form is no longer accepting submissions",
		})
		return
	}

	// Step 7: Parse form data (support both JSON and multipart)
	var formData map[string]interface{}
	var files []*storage.UploadedFile

	contentType := c.GetHeader("Content-Type")

	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "INVALID_REQUEST",
				"message": "Invalid form data",
			})
			return
		}

		formData = make(map[string]interface{})
		for key, values := range c.Request.MultipartForm.Value {
			if len(values) == 1 {
				formData[key] = values[0]
			} else {
				formData[key] = values
			}
		}
	} else {
		if err := c.ShouldBindJSON(&formData); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "INVALID_REQUEST",
				"message": "Invalid form data",
			})
			return
		}
	}

	// Step 7.5: Validate form data to prevent abuse
	const (
		MaxFields       = 100
		MaxFieldSize    = 64 * 1024
		MaxTotalPayload = 1 * 1024 * 1024
	)

	if len(formData) > MaxFields {
		log.Warn().Str("form_id", formID).Int("field_count", len(formData)).Msg("Submission rejected: too many fields")
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Too many fields in submission"})
		return
	}

	var totalPayloadSize int
	for key, value := range formData {
		valueStr := fmt.Sprintf("%v", value)
		if len(valueStr) > MaxFieldSize {
			log.Warn().Str("form_id", formID).Str("field", key).Msg("Submission rejected: field too large")
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Field value exceeds maximum size"})
			return
		}
		totalPayloadSize += len(key) + len(valueStr)
	}

	if totalPayloadSize > MaxTotalPayload {
		log.Warn().Str("form_id", formID).Int("payload_size", totalPayloadSize).Msg("Submission rejected: payload too large")
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Form data exceeds maximum size"})
		return
	}

	// Step 8: Spam detection
	isSpam := false
	spamReason := ""

	// Check honeypot field
	if formCfg.SpamCheckEnabled && formCfg.HoneypotFieldName != nil {
		if honeypotValue, exists := formData[*formCfg.HoneypotFieldName]; exists && honeypotValue != "" {
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

	// Step 8.5: CAPTCHA verification (Turnstile, reCAPTCHA, hCaptcha)
	if !isSpam && conn.SpamProvider != "" && conn.SpamProvider != "honeypot" && conn.SpamSecretKeyEncrypted != nil {
		// Get the CAPTCHA token from form data
		captchaToken := ""
		tokenFields := []string{
			"cf-turnstile-response",     // Turnstile
			"g-recaptcha-response",      // reCAPTCHA
			"h-captcha-response",        // hCaptcha
			"captcha-token",             // Generic fallback
		}
		for _, field := range tokenFields {
			if val, ok := formData[field].(string); ok && val != "" {
				captchaToken = val
				// Remove captcha token from stored form data
				delete(formData, field)
				break
			}
		}

		if captchaToken == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "CAPTCHA_REQUIRED",
				"message": "CAPTCHA verification is required",
			})
			return
		}

		// Decrypt the spam secret key
		spamSecret, err := crypto.Decrypt(*conn.SpamSecretKeyEncrypted)
		if err != nil {
			log.Error().Err(err).Str("user_id", endpoint.UserID).Msg("Failed to decrypt spam secret key")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "INTERNAL_ERROR"})
			return
		}

		// Verify CAPTCHA
		captchaResult := VerifyCaptcha(conn.SpamProvider, spamSecret, captchaToken, c.ClientIP())
		if !captchaResult.Success {
			log.Info().Str("form_id", formID).Str("provider", conn.SpamProvider).Str("error", captchaResult.Error).Msg("CAPTCHA verification failed")
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "CAPTCHA_FAILED",
				"message": "CAPTCHA verification failed. Please try again.",
			})
			return
		}
	}

	// Step 8.7: Free trial submission limit check (50 submissions max)
	if !isSpam && isFreeTrial {
		const freeTrialMaxSubmissions = 50
		var submissionCount int
		err := userPool.QueryRow(ctx, `SELECT COUNT(*) FROM submission WHERE "formId" = $1 AND "isSpam" = false`, formID).Scan(&submissionCount)
		if err == nil && submissionCount >= freeTrialMaxSubmissions {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "SUBMISSION_LIMIT_REACHED",
				"message": "Free trial submission limit reached. Connect your own infrastructure for unlimited submissions.",
			})
			return
		}
	}

	if isSpam {
		log.Info().Str("form_id", formID).Str("spam_reason", spamReason).Str("ip", c.ClientIP()).Msg("Spam detected - will save for review")
	}

	// Step 9: Generate submission ID and upload files
	submissionID := uuid.New().String()
	submittedAt := time.Now().UTC()

	// Handle file uploads (skip for spam to avoid wasting storage)
	if !isSpam && formCfg.AllowFileUploads && c.Request.MultipartForm != nil && len(c.Request.MultipartForm.File) > 0 {
		// Get the appropriate storage client
		var storageClient *storage.StorageClient
		if isFreeTrial {
			// Free trial: use platform storage
			storageClient, err = storage.GetStorageClient(formCfg.OrganizationID)
		} else {
			// BYOI: use user's own storage
			storageClient, err = h.getUserStorageClient(conn)
		}
		if err != nil {
			log.Error().Err(err).Str("user_id", endpoint.UserID).Msg("Failed to get storage client")
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":   "STORAGE_ERROR",
				"message": "File storage is not configured",
			})
			return
		}

		// Build validation config
		var maxFileSize int64 = 2 * 1024 * 1024 // 2MB default
		maxFileCount := 3
		var allowedTypes []string

		if formCfg.MaxFileSize != nil {
			maxFileSize = int64(*formCfg.MaxFileSize)
		}
		if formCfg.MaxFileCount != nil {
			maxFileCount = int(*formCfg.MaxFileCount)
		}
		if formCfg.AllowedFileTypes != nil {
			json.Unmarshal([]byte(*formCfg.AllowedFileTypes), &allowedTypes)
		}

		config := &storage.FileValidationConfig{
			MaxFileSize:      maxFileSize,
			MaxFileCount:     maxFileCount,
			AllowedMimeTypes: allowedTypes,
		}

		// Collect all files
		var fileHeaders []*multipart.FileHeader
		for _, fileList := range c.Request.MultipartForm.File {
			for _, fh := range fileList {
				fileHeaders = append(fileHeaders, fh)
			}
		}

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

	// Step 10: Create submission in user's DB
	formDataJSON, err := json.Marshal(formData)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal form data")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "INTERNAL_ERROR"})
		return
	}

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

	// Insert submission into user's DB (no transaction needed - single insert)
	_, err = userPool.Exec(ctx, `
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
		log.Error().Err(err).Str("form_id", formID).Msg("Failed to create submission")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "INTERNAL_ERROR"})
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

	// Step 11: Send email notification (async) - skip for spam
	if !isSpam && formCfg.SendEmailNotifications && formCfg.NotificationEmails != nil {
		go h.sendNotificationEmail(ctx, endpoint.UserID, conn, formCfg, submissionID, formData, files, submittedAt, userPool)
	}

	// Step 12: Send response
	if formCfg.ResponseType == "redirect" && formCfg.RedirectUrl != nil {
		c.Redirect(http.StatusFound, *formCfg.RedirectUrl)
		return
	}

	successMessage := "Thank you! Your submission has been received."
	if formCfg.SuccessMessage != nil {
		successMessage = *formCfg.SuccessMessage
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"message":       successMessage,
		"submission_id": submissionID,
	})
}

// getFormConfig queries the form configuration from the user's DB.
func (h *FormHandler) getFormConfig(ctx context.Context, pool *pgxpool.Pool, formID string) (*formConfig, error) {
	var cfg formConfig
	err := pool.QueryRow(ctx, `
		SELECT
			id, name, "isActive", "allowFileUploads",
			"maxFileCount", "maxFileSize", "allowedFileTypes",
			"spamCheckEnabled", "honeypotFieldName",
			"webhookUrl", "sendEmailNotifications", "notificationEmails",
			"responseType", "redirectUrl", "successMessage",
			"organizationId"
		FROM form
		WHERE id = $1
	`, formID).Scan(
		&cfg.ID, &cfg.Name, &cfg.IsActive, &cfg.AllowFileUploads,
		&cfg.MaxFileCount, &cfg.MaxFileSize, &cfg.AllowedFileTypes,
		&cfg.SpamCheckEnabled, &cfg.HoneypotFieldName,
		&cfg.WebhookUrl, &cfg.SendEmailNotifications, &cfg.NotificationEmails,
		&cfg.ResponseType, &cfg.RedirectUrl, &cfg.SuccessMessage,
		&cfg.OrganizationID,
	)
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

// getUserStorageClient decrypts storage config and returns the user's storage client.
func (h *FormHandler) getUserStorageClient(conn *database.UserConnection) (*storage.StorageClient, error) {
	if conn.StorageConfigEncrypted == nil || conn.StorageStatus != "connected" {
		return nil, fmt.Errorf("storage not configured")
	}

	storageJSON, err := crypto.Decrypt(*conn.StorageConfigEncrypted)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt storage config: %w", err)
	}

	var storageCfg storage.UserStorageConfig
	if err := json.Unmarshal([]byte(storageJSON), &storageCfg); err != nil {
		return nil, fmt.Errorf("invalid storage config JSON: %w", err)
	}

	usmgr := storage.GetUserStorageManager()
	client, err := usmgr.GetClient(conn.UserID, &storageCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage client: %w", err)
	}

	return client, nil
}

// sendNotificationEmail sends the notification email asynchronously.
// If user has a BYO email provider configured, uses that (no monthly cap).
// Otherwise falls back to platform Mailgun (1,000/month cap).
func (h *FormHandler) sendNotificationEmail(
	parentCtx context.Context,
	userID string,
	conn *database.UserConnection,
	formCfg *formConfig,
	submissionID string,
	formData map[string]interface{},
	files []*storage.UploadedFile,
	submittedAt time.Time,
	userPool *pgxpool.Pool,
) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Parse notification emails
	var recipients []string
	if err := json.Unmarshal([]byte(*formCfg.NotificationEmails), &recipients); err != nil {
		recipients = strings.Split(*formCfg.NotificationEmails, ",")
		for i := range recipients {
			recipients[i] = strings.TrimSpace(recipients[i])
		}
	}

	var validRecipients []string
	for _, r := range recipients {
		if r != "" {
			validRecipients = append(validRecipients, r)
		}
	}

	if len(validRecipients) == 0 {
		return
	}

	// Check if user has BYO email provider configured
	useBYOEmail := conn != nil && conn.EmailProvider != nil && conn.EmailStatus == "connected" && conn.EmailConfigEncrypted != nil

	if useBYOEmail {
		// Use BYO email provider - no monthly cap
		if err := h.sendViaBYOProvider(ctx, userID, conn, formCfg, submissionID, validRecipients, formData, files, submittedAt); err != nil {
			log.Error().Err(err).Str("form_id", formCfg.ID).Str("submission_id", submissionID).Msg("BYO email send failed, falling back to platform")
			// Fall back to platform email
			useBYOEmail = false
		}
	}

	if !useBYOEmail {
		// Use platform Mailgun with monthly cap
		const emailMonthlyCap = 1000
		emailCount, err := h.platformDB.GetEmailCount(ctx, userID)
		if err != nil {
			log.Error().Err(err).Str("user_id", userID).Msg("Failed to check email cap")
			return
		}
		if emailCount >= emailMonthlyCap {
			log.Info().Str("user_id", userID).Int("count", emailCount).Msg("Email monthly cap reached, skipping notification")
			return
		}

		// Get platform email client
		emailClient, err := email.GetEmailClient()
		if err != nil {
			log.Error().Err(err).Msg("Failed to get platform email client")
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

		notificationData := &email.SubmissionNotificationData{
			FormID:           formCfg.ID,
			FormName:         formCfg.Name,
			SubmissionID:     submissionID,
			SpaceID:          formCfg.OrganizationID,
			SpaceName:        "",
			SpaceLogo:        "",
			SubscriptionTier: "pro",
			FormData:         formData,
			Files:            fileAttachments,
			SubmittedAt:      submittedAt,
		}

		if err := emailClient.SendSubmissionNotification(ctx, validRecipients, notificationData); err != nil {
			log.Error().Err(err).Str("form_id", formCfg.ID).Str("submission_id", submissionID).Msg("Failed to send notification email")
			return
		}

		// Increment email counter in platform DB (only for platform emails)
		if err := h.platformDB.IncrementEmailCount(ctx, userID); err != nil {
			log.Warn().Err(err).Str("user_id", userID).Msg("Failed to increment email counter")
		}
	}

	// Update submission with email sent status in user's DB
	_, err := userPool.Exec(ctx, `
		UPDATE submission
		SET "emailSent" = true, "emailSentAt" = NOW(), "updatedAt" = NOW()
		WHERE id = $1
	`, submissionID)
	if err != nil {
		log.Warn().Err(err).Str("submission_id", submissionID).Msg("Failed to update emailSent status")
	}
}

// sendViaBYOProvider sends email using the user's configured BYO provider.
func (h *FormHandler) sendViaBYOProvider(
	ctx context.Context,
	userID string,
	conn *database.UserConnection,
	formCfg *formConfig,
	submissionID string,
	recipients []string,
	formData map[string]interface{},
	files []*storage.UploadedFile,
	submittedAt time.Time,
) error {
	// Decrypt config
	configJSON, err := crypto.Decrypt(*conn.EmailConfigEncrypted)
	if err != nil {
		return fmt.Errorf("failed to decrypt email config: %w", err)
	}

	// Get user email manager and provider
	emailMgr := email.GetUserEmailManager()
	provider, err := emailMgr.GetProvider(userID, *conn.EmailProvider, configJSON)
	if err != nil {
		return fmt.Errorf("failed to get email provider: %w", err)
	}

	// Build email content
	subject := fmt.Sprintf("New submission: %s", formCfg.Name)

	// Build file attachments for HTML
	var fileAttachments []email.FileAttachment
	for _, f := range files {
		fileAttachments = append(fileAttachments, email.FileAttachment{
			Name: f.Name,
			URL:  f.URL,
			Size: f.Size,
		})
	}

	// Get platform email client to reuse HTML/text builders
	emailClient, err := email.GetEmailClient()
	if err != nil {
		return fmt.Errorf("failed to get email client for templates: %w", err)
	}

	notificationData := &email.SubmissionNotificationData{
		FormID:           formCfg.ID,
		FormName:         formCfg.Name,
		SubmissionID:     submissionID,
		SpaceID:          formCfg.OrganizationID,
		SpaceName:        "",
		SpaceLogo:        "",
		SubscriptionTier: "pro",
		FormData:         formData,
		Files:            fileAttachments,
		SubmittedAt:      submittedAt,
	}

	htmlBody := emailClient.BuildNotificationHTML(notificationData)
	textBody := emailClient.BuildNotificationText(notificationData)

	// Send via BYO provider
	if err := provider.Send(ctx, recipients, subject, htmlBody, textBody); err != nil {
		return fmt.Errorf("BYO provider send failed: %w", err)
	}

	log.Info().
		Str("form_id", formCfg.ID).
		Str("submission_id", submissionID).
		Str("provider", provider.Name()).
		Int("recipient_count", len(recipients)).
		Msg("Notification email sent via BYO provider")

	return nil
}
