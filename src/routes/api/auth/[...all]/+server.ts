import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import {
	throttleLogin,
	throttleRegister,
	throttleForgotPassword,
	throttlePasswordReset,
	throttleVerificationEmail
} from '$lib/server/rate-limit';

export const GET: RequestHandler = async ({ request }) => {
	return auth.handler(request);
};

export const POST: RequestHandler = async (event) => {
	const { request } = event;
	const url = new URL(request.url);
	const pathname = url.pathname;

	// Apply rate limiting based on endpoint
	try {
		// Login endpoint
		if (pathname.includes('/sign-in/email')) {
			const result = await throttleLogin(event);
			if (!result.allowed) {
				return json(
					{
						error: 'Too many login attempts. Please try again later.',
						resetAt: result.resetAt.toISOString()
					},
					{ status: 429 }
				);
			}
		}

		// Registration endpoint
		if (pathname.includes('/sign-up/email')) {
			const result = await throttleRegister(event);
			if (!result.allowed) {
				return json(
					{
						error: 'Too many registration attempts. Please try again later.',
						resetAt: result.resetAt.toISOString()
					},
					{ status: 429 }
				);
			}
		}

		// Forgot password endpoint
		if (pathname.includes('/forget-password')) {
			// Clone request to read body without consuming it
			const clonedRequest = request.clone();
			const body = await clonedRequest.json();
			const email = body.email || '';

			const result = await throttleForgotPassword(event, email);
			if (!result.allowed) {
				return json(
					{
						error: 'Too many password reset requests. Please try again later.',
						resetAt: result.resetAt.toISOString()
					},
					{ status: 429 }
				);
			}
		}

		// Reset password endpoint
		if (pathname.includes('/reset-password')) {
			const result = await throttlePasswordReset(event);
			if (!result.allowed) {
				return json(
					{
						error: 'Too many password reset attempts. Please try again later.',
						resetAt: result.resetAt.toISOString()
					},
					{ status: 429 }
				);
			}
		}

		// Resend verification email endpoint
		if (pathname.includes('/send-verification-email')) {
			const result = await throttleVerificationEmail(event);
			if (!result.allowed) {
				return json(
					{
						error: 'Too many verification email requests. Please try again later.',
						resetAt: result.resetAt.toISOString()
					},
					{ status: 429 }
				);
			}
		}
	} catch (err) {
		// If rate limiting fails, log error and continue
		console.error('Rate limiting error:', err);
	}

	// Continue to Better Auth handler
	return auth.handler(request);
};
