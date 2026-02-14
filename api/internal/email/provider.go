package email

import "context"

// EmailProvider is the interface for BYO email providers.
// Each provider implementation (SMTP, SendGrid, Resend, Mailgun, AWS SES) must implement this interface.
type EmailProvider interface {
	// Send sends an email to the specified recipients.
	// htmlBody is the HTML version, textBody is the plain text fallback.
	Send(ctx context.Context, to []string, subject, htmlBody, textBody string) error

	// Name returns the provider name for logging purposes.
	Name() string
}

// EmailConfig represents the common configuration fields for all email providers.
type EmailConfig struct {
	Provider  string `json:"provider"` // smtp, sendgrid, resend, mailgun, aws_ses
	FromEmail string `json:"fromEmail"`
	FromName  string `json:"fromName"`
}

// SMTPConfig holds SMTP-specific configuration.
type SMTPConfig struct {
	EmailConfig
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Secure   bool   `json:"secure"` // true for TLS, false for STARTTLS
}

// SendGridConfig holds SendGrid-specific configuration.
type SendGridConfig struct {
	EmailConfig
	APIKey string `json:"apiKey"`
}

// ResendConfig holds Resend-specific configuration.
type ResendConfig struct {
	EmailConfig
	APIKey string `json:"apiKey"`
}

// MailgunConfig holds Mailgun-specific configuration.
type MailgunConfig struct {
	EmailConfig
	APIKey string `json:"apiKey"`
	Domain string `json:"domain"`
}

// AWSESConfig holds AWS SES-specific configuration.
type AWSSESConfig struct {
	EmailConfig
	AccessKeyID     string `json:"accessKeyId"`
	SecretAccessKey string `json:"secretAccessKey"`
	Region          string `json:"region"`
}
