import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { auth } from '$lib/server/auth';
import * as v from 'valibot';
import { throttlePasswordReset } from '$lib/server/rate-limit';

const resetPasswordSchema = v.object({
	password: v.pipe(
		v.string(),
		v.minLength(8, 'Password must be at least 8 characters')
	),
	confirmPassword: v.pipe(
		v.string(),
		v.minLength(1, 'Please confirm your password')
	),
	token: v.pipe(
		v.string(),
		v.minLength(1, 'Reset token is required')
	)
});

export const actions = {
	default: async (event) => {
		// Apply rate limiting (IP-based to prevent brute force)
		const rateLimit = await throttlePasswordReset(event);
		if (!rateLimit.allowed) {
			const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString();
			return fail(429, {
				error: `Too many password reset attempts. Please try again after ${resetTime}.`
			});
		}

		const formData = await event.request.formData();
		const data = {
			password: formData.get('password'),
			confirmPassword: formData.get('confirmPassword'),
			token: formData.get('token')
		};

		// Validate with Valibot
		const result = v.safeParse(resetPasswordSchema, data);

		if (!result.success) {
			const errors: Record<string, string> = {};
			for (const issue of result.issues) {
				if (issue.path) {
					const key = issue.path[0].key as string;
					errors[key] = issue.message;
				}
			}
			return fail(400, { errors });
		}

		// Check passwords match
		if (result.output.password !== result.output.confirmPassword) {
			return fail(400, {
				errors: {
					confirmPassword: 'Passwords do not match'
				}
			});
		}

		try {
			// Use Better Auth's server-side API
			await auth.api.resetPassword({
				body: {
					newPassword: result.output.password,
					token: result.output.token
				}
			});
		} catch (error) {
			return fail(500, {
				error: 'Failed to reset password. The link may have expired.'
			});
		}

		// Redirect after successful reset (outside try-catch)
		throw redirect(303, '/login');
	}
} satisfies Actions;
