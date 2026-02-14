package email

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
)

// SMTPProvider implements EmailProvider for SMTP servers.
type SMTPProvider struct {
	config *SMTPConfig
}

// NewSMTPProvider creates a new SMTP email provider.
func NewSMTPProvider(config *SMTPConfig) (*SMTPProvider, error) {
	if config.Host == "" {
		return nil, fmt.Errorf("SMTP host is required")
	}
	if config.Port == 0 {
		config.Port = 587 // Default to submission port
	}
	if config.FromEmail == "" {
		return nil, fmt.Errorf("from email is required")
	}
	return &SMTPProvider{config: config}, nil
}

// Name returns the provider name.
func (p *SMTPProvider) Name() string {
	return "smtp"
}

// Send sends an email via SMTP.
func (p *SMTPProvider) Send(ctx context.Context, to []string, subject, htmlBody, textBody string) error {
	addr := fmt.Sprintf("%s:%d", p.config.Host, p.config.Port)

	// Build the email message
	from := p.config.FromEmail
	if p.config.FromName != "" {
		from = fmt.Sprintf("%s <%s>", p.config.FromName, p.config.FromEmail)
	}

	// Build MIME message with both text and HTML parts
	boundary := "==FormTrapEmailBoundary=="
	headers := []string{
		fmt.Sprintf("From: %s", from),
		fmt.Sprintf("To: %s", strings.Join(to, ", ")),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		fmt.Sprintf("Content-Type: multipart/alternative; boundary=\"%s\"", boundary),
	}

	var body strings.Builder
	body.WriteString(strings.Join(headers, "\r\n"))
	body.WriteString("\r\n\r\n")

	// Text part
	body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	body.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
	body.WriteString("Content-Transfer-Encoding: quoted-printable\r\n\r\n")
	body.WriteString(textBody)
	body.WriteString("\r\n\r\n")

	// HTML part
	body.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	body.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n")
	body.WriteString("Content-Transfer-Encoding: quoted-printable\r\n\r\n")
	body.WriteString(htmlBody)
	body.WriteString("\r\n\r\n")

	// End boundary
	body.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	msg := []byte(body.String())

	// Set up authentication
	var auth smtp.Auth
	if p.config.Username != "" && p.config.Password != "" {
		auth = smtp.PlainAuth("", p.config.Username, p.config.Password, p.config.Host)
	}

	// Send based on secure setting
	if p.config.Secure {
		// Direct TLS connection (port 465)
		return p.sendTLS(addr, auth, p.config.FromEmail, to, msg)
	}

	// STARTTLS (port 587 or 25)
	return p.sendSTARTTLS(addr, auth, p.config.FromEmail, to, msg)
}

// sendTLS sends email over a direct TLS connection.
func (p *SMTPProvider) sendTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	tlsConfig := &tls.Config{
		ServerName: p.config.Host,
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("TLS dial failed: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, p.config.Host)
	if err != nil {
		return fmt.Errorf("SMTP client creation failed: %w", err)
	}
	defer client.Close()

	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP auth failed: %w", err)
		}
	}

	if err := client.Mail(from); err != nil {
		return fmt.Errorf("MAIL FROM failed: %w", err)
	}

	for _, recipient := range to {
		if err := client.Rcpt(recipient); err != nil {
			return fmt.Errorf("RCPT TO failed for %s: %w", recipient, err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("DATA command failed: %w", err)
	}

	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("message write failed: %w", err)
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("message close failed: %w", err)
	}

	return client.Quit()
}

// sendSTARTTLS sends email using STARTTLS.
func (p *SMTPProvider) sendSTARTTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	return smtp.SendMail(addr, auth, from, to, msg)
}
