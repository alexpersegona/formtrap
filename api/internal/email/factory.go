package email

import (
	"encoding/json"
	"fmt"
)

// NewProvider creates an EmailProvider from the encrypted config JSON.
// The providerType should be one of: smtp, sendgrid, resend, mailgun, aws_ses
func NewProvider(providerType string, configJSON string) (EmailProvider, error) {
	switch providerType {
	case "smtp":
		var cfg SMTPConfig
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			return nil, fmt.Errorf("invalid SMTP config: %w", err)
		}
		return NewSMTPProvider(&cfg)

	case "sendgrid":
		var cfg SendGridConfig
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			return nil, fmt.Errorf("invalid SendGrid config: %w", err)
		}
		return NewSendGridProvider(&cfg)

	case "resend":
		var cfg ResendConfig
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			return nil, fmt.Errorf("invalid Resend config: %w", err)
		}
		return NewResendProvider(&cfg)

	case "mailgun":
		var cfg MailgunConfig
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			return nil, fmt.Errorf("invalid Mailgun config: %w", err)
		}
		return NewMailgunBYOProvider(&cfg)

	case "aws_ses":
		var cfg AWSSESConfig
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			return nil, fmt.Errorf("invalid AWS SES config: %w", err)
		}
		return NewAWSSESProvider(&cfg)

	default:
		return nil, fmt.Errorf("unknown email provider: %s", providerType)
	}
}
