/**
 * Development-only logger utility
 * Logs are only output in development mode to avoid leaking sensitive information in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
	/**
	 * Log general information (development only)
	 */
	log: (...args: unknown[]): void => {
		if (isDevelopment) {
			console.log(...args);
		}
	},

	/**
	 * Log errors (development only)
	 * In production, errors should be sent to a logging service
	 */
	error: (...args: unknown[]): void => {
		if (isDevelopment) {
			console.error(...args);
		}
		// TODO: In production, send to error tracking service (e.g., Sentry)
	},

	/**
	 * Log warnings (development only)
	 */
	warn: (...args: unknown[]): void => {
		if (isDevelopment) {
			console.warn(...args);
		}
	},

	/**
	 * Log debug information (development only)
	 */
	debug: (...args: unknown[]): void => {
		if (isDevelopment) {
			console.debug(...args);
		}
	}
};
