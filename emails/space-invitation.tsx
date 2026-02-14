import * as React from 'react';
import { Html, Body, Container, Section, Text } from '@react-email/components';
import { EmailHeader } from './components/EmailHeader';
import { EmailFooter } from './components/EmailFooter';
import { EmailButton } from './components/EmailButton';

interface SpaceInvitationProps {
	inviterName?: string;
	spaceName?: string;
	invitationUrl?: string;
	recipientEmail?: string;
}

export default function SpaceInvitation({
	inviterName = 'John Doe',
	spaceName = 'Marketing Team',
	invitationUrl = 'https://example.com/invitations',
	recipientEmail = 'colleague@example.com'
}: SpaceInvitationProps) {
	return (
		<Html>
			<EmailHeader title={`You've been invited to join ${spaceName}`} />
			<Body style={body}>
				<Container style={container}>
					<Section style={section}>
						<Text style={greeting}>Space Invitation</Text>

						<Text style={paragraph}>
							<strong>{inviterName}</strong> has invited you to join the space{' '}
							<strong>"{spaceName}"</strong>.
						</Text>

						<Text style={paragraph}>
							Click the button below to accept the invitation and join the space:
						</Text>

						<Section style={buttonContainer}>
							<EmailButton href={invitationUrl} text="Accept Invitation" />
						</Section>

						<Text style={paragraph}>
							If you don't have an account yet, you'll need to register first using this
							email address ({recipientEmail}) to accept the invitation.
						</Text>

						<Text style={warningText}>
							<strong>This invitation will expire in 7 days.</strong>
						</Text>

						<Text style={helpText}>
							If the button above doesn't work, copy and paste the following link into your
							browser:
						</Text>

						<Text style={link}>{invitationUrl}</Text>
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
	color: 'var(--muted-foreground)',
	backgroundColor: '#fef3c7',
	padding: '12px',
	borderRadius: 'var(--radius)',
	border: '1px solid #fde047',
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
