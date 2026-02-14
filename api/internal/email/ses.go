package email

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
)

// AWSSESProvider implements EmailProvider for AWS SES.
type AWSSESProvider struct {
	config *AWSSESConfig
	client *ses.Client
}

// NewAWSSESProvider creates a new AWS SES email provider.
func NewAWSSESProvider(config *AWSSESConfig) (*AWSSESProvider, error) {
	if config.AccessKeyID == "" || config.SecretAccessKey == "" {
		return nil, fmt.Errorf("AWS credentials are required")
	}
	if config.Region == "" {
		return nil, fmt.Errorf("AWS region is required")
	}
	if config.FromEmail == "" {
		return nil, fmt.Errorf("from email is required")
	}

	// Create SES client with static credentials
	client := ses.New(ses.Options{
		Region: config.Region,
		Credentials: credentials.NewStaticCredentialsProvider(
			config.AccessKeyID,
			config.SecretAccessKey,
			"", // session token (not needed for IAM user credentials)
		),
	})

	return &AWSSESProvider{
		config: config,
		client: client,
	}, nil
}

// Name returns the provider name.
func (p *AWSSESProvider) Name() string {
	return "aws_ses"
}

// Send sends an email via AWS SES.
func (p *AWSSESProvider) Send(ctx context.Context, to []string, subject, htmlBody, textBody string) error {
	from := p.config.FromEmail
	if p.config.FromName != "" {
		from = fmt.Sprintf("%s <%s>", p.config.FromName, p.config.FromEmail)
	}

	// Build destination
	destination := &types.Destination{
		ToAddresses: to,
	}

	// Build message
	message := &types.Message{
		Subject: &types.Content{
			Data:    aws.String(subject),
			Charset: aws.String("UTF-8"),
		},
		Body: &types.Body{
			Html: &types.Content{
				Data:    aws.String(htmlBody),
				Charset: aws.String("UTF-8"),
			},
			Text: &types.Content{
				Data:    aws.String(textBody),
				Charset: aws.String("UTF-8"),
			},
		},
	}

	input := &ses.SendEmailInput{
		Source:      aws.String(from),
		Destination: destination,
		Message:     message,
	}

	_, err := p.client.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("AWS SES send failed: %w", err)
	}

	return nil
}
