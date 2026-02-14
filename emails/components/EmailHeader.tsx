import * as React from 'react';
import { Head, Section, Container, Heading } from '@react-email/components';

interface EmailHeaderProps {
	title?: string;
}

export function EmailHeader({ title }: EmailHeaderProps) {
	return (
		<>
			<Head>
				<title>{title || 'SvelteKit SaaS'}</title>
				<style>{`
					:root {
						/* Colors matching app.css design system (converted from oklch to hex for email compatibility) */
						--background: #ffffff;
						--foreground: #18181b;
						--card: #ffffff;
						--card-foreground: #18181b;
						--primary: #22c55e;
						--primary-dark: #16a34a; /* oklch(from --primary, calc(l - 0.04) c h) converted to hex */
						--primary-foreground: #fafafa;
						--secondary: #f5f5f4;
						--secondary-foreground: #27272a;
						--muted: #f5f5f4;
						--muted-foreground: #71717a;
						--accent: #f5f5f4;
						--accent-foreground: #27272a;
						--destructive: #dc2626;
						--border: #e7e5e4;
						--input: #e7e5e4;
						--ring: #34d399;

						/* Typography */
						--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

						/* Border radius */
						--radius: 0.625rem;
					}

					/* Hover effects for buttons */
					a:hover {
						opacity: 0.9 !important;
					}
				`}</style>
			</Head>
			<Section style={headerSection}>
				<Container style={container}>
					<Heading style={heading}>SvelteKit SaaS</Heading>
				</Container>
			</Section>
		</>
	);
}

const headerSection = {
	backgroundColor: 'var(--background)',
	padding: '32px 0',
	borderBottom: '1px solid var(--border)'
};

const container = {
	margin: '0 auto',
	maxWidth: '600px'
};

const heading = {
	color: 'var(--primary)',
	fontSize: '28px',
	fontWeight: 'bold',
	textAlign: 'center' as const,
	margin: '0',
	fontFamily: 'var(--font-family)'
};
