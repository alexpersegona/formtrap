import * as React from 'react';
import { Button } from '@react-email/components';

interface EmailButtonProps {
	href: string;
	text: string;
}

export function EmailButton({ href, text }: EmailButtonProps) {
	return (
		<Button href={href} style={button}>
			{text}
		</Button>
	);
}

const button = {
	backgroundColor: 'var(--primary)',
	backgroundImage: 'linear-gradient(to bottom right, var(--primary), var(--primary-dark))',
	borderRadius: 'var(--radius)',
	color: 'var(--primary-foreground)',
	fontSize: '16px',
	fontWeight: 'bold',
	textDecoration: 'none',
	textAlign: 'center' as const,
	display: 'inline-block',
	padding: '12px 32px',
	margin: '16px 0',
	cursor: 'pointer',
	boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
	fontFamily: 'var(--font-family)'
};
