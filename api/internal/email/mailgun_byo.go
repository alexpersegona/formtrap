package email

import (
	"context"
	"fmt"
	"time"

	"github.com/mailgun/mailgun-go/v4"
)

// MailgunBYOProvider implements EmailProvider for user's own Mailgun account.
type MailgunBYOProvider struct {
	config *MailgunConfig
	mg     *mailgun.MailgunImpl
}

// NewMailgunBYOProvider creates a new Mailgun BYO email provider.
func NewMailgunBYOProvider(config *MailgunConfig) (*MailgunBYOProvider, error) {
	if config.APIKey == "" {
		return nil, fmt.Errorf("Mailgun API key is required")
	}
	if config.Domain == "" {
		return nil, fmt.Errorf("Mailgun domain is required")
	}
	if config.FromEmail == "" {
		return nil, fmt.Errorf("from email is required")
	}

	mg := mailgun.NewMailgun(config.Domain, config.APIKey)

	return &MailgunBYOProvider{
		config: config,
		mg:     mg,
	}, nil
}

// Name returns the provider name.
func (p *MailgunBYOProvider) Name() string {
	return "mailgun"
}

// Send sends an email via user's Mailgun account.
func (p *MailgunBYOProvider) Send(ctx context.Context, to []string, subject, htmlBody, textBody string) error {
	from := p.config.FromEmail
	if p.config.FromName != "" {
		from = fmt.Sprintf("%s <%s>", p.config.FromName, p.config.FromEmail)
	}

	message := mailgun.NewMessage(from, subject, textBody, to...)
	message.SetHTML(htmlBody)

	sendCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	_, _, err := p.mg.Send(sendCtx, message)
	if err != nil {
		return fmt.Errorf("Mailgun send failed: %w", err)
	}

	return nil
}
