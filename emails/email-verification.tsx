import * as React from 'react';
import { Html, Body, Container, Section, Text } from '@react-email/components';
import { EmailHeader } from './components/EmailHeader';
import { EmailFooter } from './components/EmailFooter';
import { EmailButton } from './components/EmailButton';

interface EmailVerificationProps {
	verificationUrl?: string;
}

export default function EmailVerification({
	verificationUrl = 'https://example.com/verify-email?token=abc123def456'
}: EmailVerificationProps) {
	return (
		<Html>
			<EmailHeader title="Verify Your Email - SvelteKit SaaS" />
			<Body style={body}>
				<Container style={container}>
					<Section style={section}>
						<Text style={greeting}>Welcome to SvelteKit SaaS!</Text>

						<Text style={paragraph}>
							Thank you for signing up! To complete your registration and access your account,
							please verify your email address by clicking the button below.
						</Text>

						<Section style={buttonContainer}>
							<EmailButton href={verificationUrl} text="Verify Email Address" />
						</Section>

						<Text style={paragraph}>
							This verification link will expire in 24 hours for security reasons.
						</Text>

						<Text style={helpText}>
							If you didn't create an account with SvelteKit SaaS, you can safely ignore this
							email.
						</Text>

						<Text style={helpText}>
							If the button above doesn't work, copy and paste the following link into your
							browser:
						</Text>

						<Text style={link}>{verificationUrl}</Text>
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
