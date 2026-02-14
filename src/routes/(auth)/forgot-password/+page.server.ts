import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { throttleForgotPassword } from '$lib/server/rate-limit';

export const actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');

		if (!email || typeof email !== 'string') {
			return fail(400, {
				error: 'Email is required'
			});
		}

		// Apply rate limiting (IP + email combo)
		const rateLimit = await throttleForgotPassword(event, email);
		if (!rateLimit.allowed) {
			const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString();
			return fail(429, {
				error: `Too many password reset requests. Please try again after ${resetTime}.`
			});
		}

		try {
			// Call Better Auth's forget password endpoint
			const baseURL = event.url.origin;
			const response = await fetch(`${baseURL}/api/auth/forget-password`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email,
					redirectTo: '/reset-password'
				})
			});

			// Better Auth returns 200 even for success (to prevent email enumeration)
			// Always return success to the user for security
			// (Don't reveal whether the email exists or not)
			return { success: true };
		} catch (error) {
			// Network or server error - show generic error
			return fail(500, {
				error: 'Failed to send reset email. Please try again.'
			});
		}
	}
} satisfies Actions;
