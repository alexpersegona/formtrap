package discord

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// AlertOptions contains the options for sending a Discord alert
type AlertOptions struct {
	Title       string
	Description string
	Severity    string // "critical", "error", "warning"
	ErrorCode   string
	Error       string
	Context     map[string]string
}

// Rate limiting
var (
	rateLimitCache = make(map[string]time.Time)
	rateLimitMu    sync.Mutex
	rateLimitWindow = 5 * time.Minute
)

func isRateLimited(key string) bool {
	rateLimitMu.Lock()
	defer rateLimitMu.Unlock()

	lastSent, exists := rateLimitCache[key]
	if exists && time.Since(lastSent) < rateLimitWindow {
		return true
	}

	rateLimitCache[key] = time.Now()
	return false
}

func getSeverityEmoji(severity string) string {
	switch severity {
	case "critical":
		return "🚨"
	case "error":
		return "❌"
	case "warning":
		return "⚠️"
	default:
		return "ℹ️"
	}
}

func getEnvironment() string {
	env := os.Getenv("APP_ENV")
	if env == "" {
		return "development"
	}
	return env
}

// SendAlert sends an alert to Discord webhook (async via goroutine)
// Rate limited to 1 alert per error type per 5 minutes
func SendAlert(opts AlertOptions) {
	webhookURL := os.Getenv("DISCORD_WEBHOOK_URL")
	if webhookURL == "" {
		// Silently skip if no webhook configured
		return
	}

	// Run in goroutine to not block the caller
	go func() {
		rateLimitKey := fmt.Sprintf("%s:%s", opts.Title, opts.ErrorCode)

		if isRateLimited(rateLimitKey) {
			log.Debug().Str("key", rateLimitKey).Msg("Discord alert rate limited")
			return
		}

		emoji := getSeverityEmoji(opts.Severity)
		environment := getEnvironment()
		timestamp := time.Now().UTC().Format(time.RFC3339)

		// Build message
		var message bytes.Buffer
		message.WriteString(fmt.Sprintf("%s **%s**\n", emoji, opts.Title))
		message.WriteString("━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
		message.WriteString(opts.Description + "\n\n")
		message.WriteString(fmt.Sprintf("**Severity:**    %s\n", opts.Severity))
		message.WriteString(fmt.Sprintf("**Environment:** %s\n", environment))
		message.WriteString(fmt.Sprintf("**Timestamp:**   %s\n", timestamp))
		message.WriteString(fmt.Sprintf("**Error Code:**  %s\n", opts.ErrorCode))

		// Add context fields
		if len(opts.Context) > 0 {
			message.WriteString("\n")
			for key, value := range opts.Context {
				message.WriteString(fmt.Sprintf("**%s:** %s\n", key, value))
			}
		}

		// Add error message
		if opts.Error != "" {
			message.WriteString(fmt.Sprintf("\n**Error:** %s\n", opts.Error))
		}

		message.WriteString("━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
		message.WriteString("*FormTrap Alert System*")

		// Send to Discord
		payload := map[string]string{
			"content": message.String(),
		}

		jsonPayload, err := json.Marshal(payload)
		if err != nil {
			log.Error().Err(err).Msg("Failed to marshal Discord payload")
			return
		}

		resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(jsonPayload))
		if err != nil {
			log.Error().Err(err).Msg("Failed to send Discord alert")
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			log.Error().Int("status", resp.StatusCode).Msg("Discord webhook returned error")
		}
	}()
}

// AlertDatabaseError alerts for database connection failures
func AlertDatabaseError(err error, context map[string]string) {
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
	}

	SendAlert(AlertOptions{
		Title:       "Database Connection Error",
		Description: "Database is unreachable or query failed.",
		Severity:    "critical",
		ErrorCode:   "DATABASE_ERROR",
		Error:       errMsg,
		Context:     context,
	})
}

// AlertStorageError alerts for storage service errors
func AlertStorageError(err error, context map[string]string) {
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
	}

	SendAlert(AlertOptions{
		Title:       "Storage Service Error",
		Description: "Storage service (R2/S3) encountered an error.",
		Severity:    "critical",
		ErrorCode:   "STORAGE_ERROR",
		Error:       errMsg,
		Context:     context,
	})
}

// AlertJobQueueError alerts for job queue failures
func AlertJobQueueError(err error, jobType string) {
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
	}

	SendAlert(AlertOptions{
		Title:       "Job Queue Error",
		Description: "Job queue processing failed.",
		Severity:    "critical",
		ErrorCode:   "JOB_QUEUE_ERROR",
		Error:       errMsg,
		Context: map[string]string{
			"Job Type": jobType,
		},
	})
}

// AlertCryptoError alerts for encryption/decryption failures
func AlertCryptoError(err error, operation string) {
	errMsg := ""
	if err != nil {
		errMsg = err.Error()
	}

	SendAlert(AlertOptions{
		Title:       "Cryptography Error",
		Description: "Encryption or decryption operation failed.",
		Severity:    "critical",
		ErrorCode:   "CRYPTO_ERROR",
		Error:       errMsg,
		Context: map[string]string{
			"Operation": operation,
		},
	})
}
