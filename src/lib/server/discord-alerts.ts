import { env } from '$env/dynamic/private';

interface AlertOptions {
	title: string;
	description: string;
	severity: 'critical' | 'error' | 'warning';
	errorCode: string;
	error?: string;
	context?: Record<string, string>;
}

// In-memory rate limiter: key -> timestamp
const rateLimitCache = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isRateLimited(key: string): boolean {
	const now = Date.now();
	const lastSent = rateLimitCache.get(key);

	if (lastSent && now - lastSent < RATE_LIMIT_WINDOW_MS) {
		return true;
	}

	rateLimitCache.set(key, now);
	return false;
}

function getSeverityEmoji(severity: AlertOptions['severity']): string {
	switch (severity) {
		case 'critical':
			return '🚨';
		case 'error':
			return '❌';
		case 'warning':
			return '⚠️';
	}
}

function getEnvironment(): string {
	return env.NODE_ENV || 'development';
}

/**
 * Send an alert to Discord webhook
 * Rate limited to 1 alert per error type per 5 minutes
 */
export async function sendDiscordAlert(options: AlertOptions): Promise<void> {
	const webhookUrl = env.DISCORD_WEBHOOK_URL;

	if (!webhookUrl) {
		// Silently skip if no webhook configured
		return;
	}

	const rateLimitKey = `${options.title}:${options.errorCode}`;

	if (isRateLimited(rateLimitKey)) {
		console.log(`[Discord Alert] Rate limited: ${rateLimitKey}`);
		return;
	}

	const emoji = getSeverityEmoji(options.severity);
	const environment = getEnvironment();
	const timestamp = new Date().toISOString();

	// Build context fields
	const contextFields = options.context
		? Object.entries(options.context).map(([key, value]) => `${key}: ${value}`)
		: [];

	const message = [
		`${emoji} **${options.title}**`,
		'━━━━━━━━━━━━━━━━━━━━━━━━━━━',
		options.description,
		'',
		`**Severity:**    ${options.severity.toUpperCase()}`,
		`**Environment:** ${environment}`,
		`**Timestamp:**   ${timestamp}`,
		`**Error Code:**  ${options.errorCode}`,
		...(contextFields.length > 0 ? ['', ...contextFields] : []),
		...(options.error ? ['', `**Error:** ${options.error}`] : []),
		'━━━━━━━━━━━━━━━━━━━━━━━━━━━',
		'*FormTrap Alert System*'
	].join('\n');

	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				content: message
			})
		});

		if (!response.ok) {
			console.error(`[Discord Alert] Failed to send: ${response.status} ${response.statusText}`);
		}
	} catch (error) {
		console.error('[Discord Alert] Failed to send:', error);
	}
}

/**
 * Alert for database connection failures
 */
export function alertDatabaseError(error: unknown): void {
	sendDiscordAlert({
		title: 'Database Connection Error',
		description: 'Database is unreachable or query failed.',
		severity: 'critical',
		errorCode: 'DATABASE_ERROR',
		error: error instanceof Error ? error.message : String(error)
	}).catch(() => {
		// Ignore errors from the alert itself
	});
}

/**
 * Alert for authentication system errors
 */
export function alertAuthError(error: unknown, context?: Record<string, string>): void {
	sendDiscordAlert({
		title: 'Authentication Error',
		description: 'Authentication system encountered an error.',
		severity: 'critical',
		errorCode: 'AUTH_ERROR',
		error: error instanceof Error ? error.message : String(error),
		context
	}).catch(() => {
		// Ignore errors from the alert itself
	});
}

/**
 * Alert for storage service errors
 */
export function alertStorageError(error: unknown, context?: Record<string, string>): void {
	sendDiscordAlert({
		title: 'Storage Service Error',
		description: 'Storage service (R2/S3) encountered an error.',
		severity: 'critical',
		errorCode: 'STORAGE_ERROR',
		error: error instanceof Error ? error.message : String(error),
		context
	}).catch(() => {
		// Ignore errors from the alert itself
	});
}
