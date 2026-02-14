package email

import (
	"context"
	"fmt"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

// SendGridProvider implements EmailProvider for SendGrid.
type SendGridProvider struct {
	config *SendGridConfig
	client *sendgrid.Client
}

// NewSendGridProvider creates a new SendGrid email provider.
func NewSendGridProvider(config *SendGridConfig) (*SendGridProvider, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("SendGrid API key is required")
	}
	if config.FromEmail == "" {
		return nil, fmt.Errorf("from email is required")
	}

	client := sendgrid.NewSendClient(config.APIKey)

	return &SendGridProvider{
		config: config,
		client: client,
	}, nil
}

// Name returns the provider name.
func (p *SendGridProvider) Name() string {
	return "sendgrid"
}

// Send sends an email via SendGrid.
func (p *SendGridProvider) Send(ctx context.Context, to []string, subject, htmlBody, textBody string) error {
	from := mail.NewEmail(p.config.FromName, p.config.FromEmail)

	// Create personalization for multiple recipients
	message := mail.NewV3Mail()
	message.SetFrom(from)
	message.Subject = subject

	personalization := mail.NewPersonalization()
	for _, recipient := range to {
		personalization.AddTos(mail.NewEmail("", recipient))
	}
	message.AddPersonalizations(personalization)

	// Add content (text first, then HTML)
	message.AddContent(mail.NewContent("text/plain", textBody))
	message.AddContent(mail.NewContent("text/html", htmlBody))

	response, err := p.client.SendWithContext(ctx, message)
	if err != nil {
		return fmt.Errorf("SendGrid send failed: %w", err)
	}

	if response.StatusCode >= 400 {
		return fmt.Errorf("SendGrid returned status %d: %s", response.StatusCode, response.Body)
	}

	return nil
}
