package email

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"os"
	"strings"
	"time"

	"github.com/mailgun/mailgun-go/v4"
	"github.com/rs/zerolog/log"
)

// EmailClient wraps the Mailgun client
type EmailClient struct {
	mg         *mailgun.MailgunImpl
	fromEmail  string
	fromName   string
	appURL     string
	defaultLogo string
}

// SubmissionNotificationData contains data for the notification email
type SubmissionNotificationData struct {
	FormID           string
	FormName         string
	SubmissionID     string
	SpaceID          string // Organization ID for dashboard URL
	SpaceName        string
	SpaceLogo        string // JSON with variants or empty
	SubscriptionTier string // "free", "pro", "business"
	FormData         map[string]interface{}
	Files            []FileAttachment
	SubmittedAt      time.Time
}

// FileAttachment represents a file in the notification
type FileAttachment struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Size int64  `json:"size"`
}

// LogoVariants represents the JSON structure of space logos
// Matches the image collection variants from SvelteKit's image-processor
type LogoVariants struct {
	Thumbnail   string `json:"thumbnail"`
	Thumbnail2x string `json:"thumbnail@2x"`
	Regular     string `json:"regular"`
	Regular2x   string `json:"regular@2x"`
	Small       string `json:"small"`
	Medium      string `json:"medium"`
	Large       string `json:"large"`
}

var client *EmailClient

// GetEmailClient returns the email client instance
func GetEmailClient() (*EmailClient, error) {
	if client != nil {
		return client, nil
	}

	apiKey := os.Getenv("MAILGUN_API_KEY")
	domain := os.Getenv("MAILGUN_DOMAIN")
	fromEmail := os.Getenv("MAILGUN_FROM_EMAIL")
	fromName := os.Getenv("MAILGUN_FROM_NAME")
	appURL := os.Getenv("APP_URL")

	if apiKey == "" || domain == "" {
		return nil, fmt.Errorf("Mailgun credentials not configured")
	}

	if fromEmail == "" {
		fromEmail = "noreply@" + domain
	}
	if fromName == "" {
		fromName = "FormTrap"
	}
	if appURL == "" {
		appURL = "https://formtrap.io"
	}

	mg := mailgun.NewMailgun(domain, apiKey)

	// Default FormTrap logo (hosted on CDN)
	defaultLogo := os.Getenv("R2_PUBLIC_URL") + "/logos/formtrap-logo.png"

	client = &EmailClient{
		mg:          mg,
		fromEmail:   fromEmail,
		fromName:    fromName,
		appURL:      appURL,
		defaultLogo: defaultLogo,
	}

	log.Info().Str("domain", domain).Str("app_url", appURL).Msg("Mailgun email client initialized")

	return client, nil
}

// SendSubmissionNotification sends an email notification for a new form submission
func (ec *EmailClient) SendSubmissionNotification(
	ctx context.Context,
	recipients []string,
	data *SubmissionNotificationData,
) error {
	if len(recipients) == 0 {
		return nil
	}

	// Determine which logo to use
	logoURL := ec.getLogoURL(data.SpaceLogo, data.SubscriptionTier)

	// Build email content
	subject := fmt.Sprintf("New submission: %s", data.FormName)
	htmlBody := ec.buildNotificationHTML(data, logoURL)
	textBody := ec.buildNotificationText(data)

	// Create message
	from := fmt.Sprintf("%s <%s>", ec.fromName, ec.fromEmail)
	message := ec.mg.NewMessage(from, subject, textBody, recipients...)
	message.SetHtml(htmlBody)

	// Send with timeout
	sendCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	resp, id, err := ec.mg.Send(sendCtx, message)
	if err != nil {
		log.Error().
			Err(err).
			Str("form_id", data.FormID).
			Str("submission_id", data.SubmissionID).
			Strs("recipients", recipients).
			Msg("Failed to send notification email")
		return err
	}

	log.Info().
		Str("form_id", data.FormID).
		Str("submission_id", data.SubmissionID).
		Str("message_id", id).
		Str("response", resp).
		Int("recipient_count", len(recipients)).
		Msg("Notification email sent")

	return nil
}

// getLogoURL determines which logo to use based on tier and space config
func (ec *EmailClient) getLogoURL(spaceLogo string, tier string) string {
	// Use FormTrap logo for Free tier
	if tier == "free" || tier == "" {
		return ec.defaultLogo
	}

	// Use FormTrap logo if no space logo is set
	if spaceLogo == "" {
		return ec.defaultLogo
	}

	// Try to parse logo as JSON with variants
	var variants LogoVariants
	if err := json.Unmarshal([]byte(spaceLogo), &variants); err == nil {
		// Prefer regular variant for emails (good balance of size/quality)
		if variants.Regular != "" {
			return variants.Regular
		}
		// Fall back to other variants
		if variants.Medium != "" {
			return variants.Medium
		}
		if variants.Small != "" {
			return variants.Small
		}
		if variants.Large != "" {
			return variants.Large
		}
		if variants.Thumbnail != "" {
			return variants.Thumbnail
		}
	}

	// If not JSON, assume it's a direct URL (legacy)
	if strings.HasPrefix(spaceLogo, "http") {
		return spaceLogo
	}

	// Fallback to default
	return ec.defaultLogo
}

// buildNotificationHTML creates the HTML email body
func (ec *EmailClient) buildNotificationHTML(data *SubmissionNotificationData, logoURL string) string {
	// Collect visible fields (skip internal/hidden fields starting with _)
	type field struct {
		key   string
		value string
	}
	var visibleFields []field
	for key, value := range data.FormData {
		if strings.HasPrefix(key, "_") {
			continue
		}
		visibleFields = append(visibleFields, field{key: key, value: formatValue(value)})
	}

	// Build form fields HTML
	var fieldsHTML strings.Builder
	for i, f := range visibleFields {
		// Add border-bottom to all rows except the last one
		borderStyle := "border-bottom: 1px solid #e5e7eb;"
		if i == len(visibleFields)-1 {
			borderStyle = ""
		}

		fieldsHTML.WriteString(fmt.Sprintf(`
			<tr>
				<td style="padding: 12px 16px; %s color: #6b7280; font-weight: 500; width: 140px; vertical-align: top;">%s</td>
				<td style="padding: 12px 16px; %s color: #111827;">%s</td>
			</tr>
		`, borderStyle, html.EscapeString(formatFieldName(f.key)), borderStyle, html.EscapeString(f.value)))
	}

	// Build attachments HTML
	var attachmentsHTML string
	if len(data.Files) > 0 {
		var filesBuilder strings.Builder
		for _, file := range data.Files {
			filesBuilder.WriteString(fmt.Sprintf(`
				<li style="margin-bottom: 8px;">
					<a href="%s" style="color: #2563eb; text-decoration: none;">%s</a>
					<span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">(%s)</span>
				</li>
			`, html.EscapeString(file.URL), html.EscapeString(file.Name), formatFileSize(file.Size)))
		}

		attachmentsHTML = fmt.Sprintf(`
			<div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
				<h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">Attachments</h3>
				<ul style="margin: 0; padding-left: 20px; color: #374151;">
					%s
				</ul>
			</div>
		`, filesBuilder.String())
	}

	// Dashboard link - deep link to the specific submission
	dashboardURL := fmt.Sprintf("%s/spaces/%s/forms/%s?submission=%s", ec.appURL, data.SpaceID, data.FormID, data.SubmissionID)

	// Format timestamp
	timestamp := data.SubmittedAt.Format("Jan 2, 2006 at 3:04 PM")

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
	<div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
		<div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
			<!-- Header -->
			<div style="padding: 24px 32px; border-bottom: 1px solid #e5e7eb;">
				<table style="width: 100%%; border-collapse: collapse;">
					<tr>
						<td style="width: 100px; vertical-align: middle; padding-right: 20px;">
							<img src="%s" alt="Logo" style="height: 100px; max-width: 100px; object-fit: contain;">
						</td>
						<td style="vertical-align: middle;">
							<h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">New submission: %s</h1>
							<p style="margin: 6px 0 0 0; font-size: 14px; color: #6b7280;">%s</p>
						</td>
					</tr>
				</table>
			</div>

			<!-- Form Data -->
			<div style="padding: 24px 32px;">
				<table style="width: 100%%; border-collapse: collapse;">
					%s
				</table>

				%s
			</div>

			<!-- Footer -->
			<div style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
				<p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">
					Submitted on %s
				</p>
				<a href="%s" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
					View in Dashboard
				</a>
			</div>
		</div>

		<p style="margin-top: 24px; text-align: center; font-size: 12px; color: #9ca3af;">
			Powered by <a href="https://formtrap.io" style="color: #6b7280;">FormTrap</a>
		</p>
	</div>
</body>
</html>
`, logoURL, html.EscapeString(data.FormName), html.EscapeString(data.SpaceName), fieldsHTML.String(), attachmentsHTML, timestamp, dashboardURL)
}

// buildNotificationText creates the plain text email body
func (ec *EmailClient) buildNotificationText(data *SubmissionNotificationData) string {
	var text strings.Builder

	text.WriteString(fmt.Sprintf("New submission: %s\n", data.FormName))
	text.WriteString(fmt.Sprintf("Space: %s\n\n", data.SpaceName))
	text.WriteString("--- Form Data ---\n\n")

	for key, value := range data.FormData {
		if strings.HasPrefix(key, "_") {
			continue
		}
		text.WriteString(fmt.Sprintf("%s: %s\n", formatFieldName(key), formatValue(value)))
	}

	if len(data.Files) > 0 {
		text.WriteString("\n--- Attachments ---\n\n")
		for _, file := range data.Files {
			text.WriteString(fmt.Sprintf("- %s: %s\n", file.Name, file.URL))
		}
	}

	text.WriteString(fmt.Sprintf("\nSubmitted: %s\n", data.SubmittedAt.Format("Jan 2, 2006 at 3:04 PM")))

	dashboardURL := fmt.Sprintf("%s/spaces/%s/forms/%s?submission=%s", ec.appURL, data.SpaceID, data.FormID, data.SubmissionID)
	text.WriteString(fmt.Sprintf("\nView in Dashboard: %s\n", dashboardURL))

	return text.String()
}

// formatFieldName converts camelCase or snake_case to readable format
func formatFieldName(name string) string {
	// Replace underscores and hyphens with spaces
	name = strings.ReplaceAll(name, "_", " ")
	name = strings.ReplaceAll(name, "-", " ")

	// Add space before capital letters (camelCase)
	var result strings.Builder
	for i, r := range name {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune(' ')
		}
		result.WriteRune(r)
	}

	// Title case
	return strings.Title(strings.ToLower(result.String()))
}

// formatValue converts interface{} to string representation
func formatValue(v interface{}) string {
	if v == nil {
		return ""
	}

	switch val := v.(type) {
	case string:
		return val
	case float64:
		if val == float64(int(val)) {
			return fmt.Sprintf("%d", int(val))
		}
		return fmt.Sprintf("%.2f", val)
	case bool:
		if val {
			return "Yes"
		}
		return "No"
	case []interface{}:
		var parts []string
		for _, item := range val {
			parts = append(parts, formatValue(item))
		}
		return strings.Join(parts, ", ")
	default:
		return fmt.Sprintf("%v", val)
	}
}

// formatFileSize formats bytes to human readable size
func formatFileSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
