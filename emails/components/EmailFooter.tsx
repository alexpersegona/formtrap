import * as React from 'react';
import { Section, Container, Text, Hr } from '@react-email/components';

export function EmailFooter() {
	const currentYear = new Date().getFullYear();

	return (
		<Section style={footerSection}>
			<Container style={container}>
				<Hr style={hr} />
				<Text style={footerText}>
					© {currentYear} SvelteKit SaaS. All rights reserved.
				</Text>
				<Text style={footerText}>
					You received this email because you signed up for an account.
				</Text>
			</Container>
		</Section>
	);
}

const footerSection = {
	backgroundColor: 'var(--muted)',
	padding: '32px 0'
};

const container = {
	margin: '0 auto',
	maxWidth: '600px'
};

const hr = {
	borderColor: 'var(--border)',
	margin: '20px 0'
};

const footerText = {
	color: 'var(--muted-foreground)',
	fontSize: '12px',
	textAlign: 'center' as const,
	margin: '4px 0',
	fontFamily: 'var(--font-family)'
};
