import fs from 'fs';
import path from 'path';

const LOG_DIR = 'logs';
const LOG_FILE = path.join(LOG_DIR, 'auth.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
	fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logAuth(message: string, data?: any) {
	const timestamp = new Date().toISOString();
	const logEntry = `[${timestamp}] ${message}${data ? ` | ${JSON.stringify(data)}` : ''}\n`;

	// Log to console
	console.log(`🔐 ${message}`, data || '');

	// Log to file
	fs.appendFileSync(LOG_FILE, logEntry);
}

export function clearAuthLog() {
	if (fs.existsSync(LOG_FILE)) {
		fs.unlinkSync(LOG_FILE);
	}
	logAuth('=== AUTH LOG CLEARED ===');
}
