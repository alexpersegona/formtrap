package email

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v2"
)

// ResendProvider implements EmailProvider for Resend.
type ResendProvider struct {
	config *ResendConfig
	client *resend.Client
}

// NewResendProvider creates a new Resend email provider.
func NewResendProvider(config *ResendConfig) (*ResendProvider, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("Resend API key is required")
	}
	if config.FromEmail == "" {
		return nil, fmt.Errorf("from email is required")
	}

	client := resend.NewClient(config.APIKey)

	return &ResendProvider{
		config: config,
		client: client,
	}, nil
}

// Name returns the provider name.
func (p *ResendProvider) Name() string {
	return "resend"
}

// Send sends an email via Resend.
func (p *ResendProvider) Send(ctx context.Context, to []string, subject, htmlBody, textBody string) error {
	from := p.config.FromEmail
	if p.config.FromName != "" {
		from = fmt.Sprintf("%s <%s>", p.config.FromName, p.config.FromEmail)
	}

	params := &resend.SendEmailRequest{
		From:    from,
		To:      to,
		Subject: subject,
		Html:    htmlBody,
		Text:    textBody,
	}

	_, err := p.client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("Resend send failed: %w", err)
	}

	return nil
}
