import * as React from 'react';
import { Html, Body, Container, Section, Text } from '@react-email/components';
import { EmailHeader } from './components/EmailHeader';
import { EmailFooter } from './components/EmailFooter';
import { EmailButton } from './components/EmailButton';

interface PasswordResetProps {
	resetUrl?: string;
}

export default function PasswordReset({
	resetUrl = 'https://example.com/reset-password?token=abc123def456'
}: PasswordResetProps) {
	return (
		<Html>
			<EmailHeader title="Reset Your Password - SvelteKit SaaS" />
			<Body style={body}>
				<Container style={container}>
					<Section style={section}>
						<Text style={greeting}>Password Reset Request</Text>

						<Text style={paragraph}>
							We received a request to reset the password for your SvelteKit SaaS account. If
							you made this request, click the button below to reset your password.
						</Text>

						<Section style={buttonContainer}>
							<EmailButton href={resetUrl} text="Reset Password" />
						</Section>

						<Text style={paragraph}>
							This password reset link will expire in 1 hour for security reasons.
						</Text>

						<Text style={warningText}>
							If you didn't request a password reset, please ignore this email or contact
							support if you have concerns about your account security.
						</Text>

						<Text style={helpText}>
							If the button above doesn't work, copy and paste the following link into your
							browser:
						</Text>

						<Text style={link}>{resetUrl}</Text>
					</Section>
				</Container>
				<EmailFooter />
			</Body>
		</Html>
	);
}

const body = {
	backgroundColor: 'var(--background)',
	fontFamily: 'var(--font-family)'
};

const container = {
	margin: '0 auto',
	maxWidth: '600px',
	backgroundColor: 'var(--background)'
};

const section = {
	padding: '32px'
};

const greeting = {
	fontSize: '24px',
	fontWeight: 'bold',
	color: 'var(--foreground)',
	margin: '0 0 16px',
	fontFamily: 'var(--font-family)'
};

const paragraph = {
	fontSize: '16px',
	lineHeight: '24px',
	color: 'var(--foreground)',
	margin: '16px 0',
	fontFamily: 'var(--font-family)'
};

const buttonContainer = {
	textAlign: 'center' as const,
	margin: '24px 0'
};

const warningText = {
	fontSize: '14px',
	lineHeight: '20px',
	color: 'var(--destructive)',
	backgroundColor: '#fef2f2',
	padding: '12px',
	borderRadius: 'var(--radius)',
	border: '1px solid #fecaca',
	margin: '16px 0',
	fontFamily: 'var(--font-family)'
};

const helpText = {
	fontSize: '14px',
	lineHeight: '20px',
	color: 'var(--muted-foreground)',
	margin: '12px 0',
	fontFamily: 'var(--font-family)'
};

const link = {
	fontSize: '12px',
	color: 'var(--primary)',
	wordBreak: 'break-all' as const,
	margin: '8px 0',
	fontFamily: 'var(--font-family)'
};
