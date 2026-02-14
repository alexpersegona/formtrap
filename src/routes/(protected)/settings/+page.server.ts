import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import * as v from 'valibot';
import { throttleByUserId } from '$lib/server/rate-limit';
import { changePasswordSchema } from '$lib/validation/auth';
import { getUserSubscription } from '$lib/server/pricing/subscription';
import { db } from '$lib/server/db';
import { subscription } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = locals.user.id;
	const subscriptionData = await getUserSubscription(userId);

	return {
		user: locals.user,
		twoFactorEnabled: locals.user.twoFactorEnabled ?? false,
		subscription: subscriptionData
	};
};

export const actions = {
	changePassword: async (event) => {
		if (!event.locals.user) {
			throw redirect(303, '/login');
		}

		// Apply rate limiting (per user ID)
		const rateLimit = await throttleByUserId(event);
		if (!rateLimit.allowed) {
			const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString();
			return fail(429, {
				error: `Too many password change attempts. Please try again after ${resetTime}.`
			});
		}

		const formData = await event.request.formData();
		const data = {
			currentPassword: formData.get('currentPassword'),
			newPassword: formData.get('newPassword'),
			confirmNewPassword: formData.get('confirmNewPassword')
		};

		// Validate with Valibot
		const result = v.safeParse(changePasswordSchema, data);

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

		// Check new passwords match
		if (result.output.newPassword !== result.output.confirmNewPassword) {
			return fail(400, {
				errors: {
					confirmNewPassword: 'Passwords do not match'
				}
			});
		}

		// Check new password is different from current
		if (result.output.currentPassword === result.output.newPassword) {
			return fail(400, {
				errors: {
					newPassword: 'New password must be different from current password'
				}
			});
		}

		try {
			// Use Better Auth's server-side API to change password
			await auth.api.changePassword({
				body: {
					newPassword: result.output.newPassword,
					currentPassword: result.output.currentPassword,
					revokeOtherSessions: false
				},
				headers: event.request.headers
			});

			return {
				success: true,
				message: 'Password changed successfully'
			};
		} catch (error: any) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Change password error:', error);
			}

			// Check if it's a wrong password error
			if (error?.message?.includes('password') || error?.status === 401) {
				return fail(400, {
					errors: {
						currentPassword: 'Current password is incorrect'
					}
				});
			}

			return fail(500, {
				error: 'Failed to change password. Please try again.'
			});
		}
	},

	enableTwoFactor: async (event) => {
		if (!event.locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await event.request.formData();
		const password = formData.get('password')?.toString();

		if (!password) {
			return fail(400, { error: 'Password is required' });
		}

		try {
			// Call Better Auth's two-factor generate endpoint directly
			// Pass issuer in the body to ensure proper branding in authenticator apps
			const baseURL = event.url.origin;
			const issuer = process.env.PUBLIC_COMPANY_NAME || process.env.PUBLIC_APP_NAME || 'SvelteKit SaaS';

			console.log('Enabling 2FA with issuer:', issuer);

			const response = await fetch(`${baseURL}/api/auth/two-factor/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...Object.fromEntries(event.request.headers.entries())
				},
				body: JSON.stringify({
					password,
					issuer
				})
			});

			if (!response.ok) {
				const error = await response.text();
				if (process.env.NODE_ENV === 'development') {
					console.error('2FA generate error:', error);
				}

				if (response.status === 401) {
					return fail(400, { error: 'Incorrect password' });
				}

				return fail(response.status, { error: 'Failed to enable 2FA. Please try again.' });
			}

			const result = await response.json();

			console.log('2FA enabled successfully, TOTP URI:', result.totpURI || result.qrCode);

			return {
				success: true,
				qrCode: result.qrCode,
				secret: result.secret,
				backupCodes: result.backupCodes
			};
		} catch (error: any) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Enable 2FA error:', error);
			}
			return fail(500, { error: 'Failed to enable 2FA. Please try again.' });
		}
	},

	verifyTwoFactorSetup: async (event) => {
		if (!event.locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await event.request.formData();
		const code = formData.get('code')?.toString();

		if (!code || code.length !== 6) {
			return fail(400, { error: 'Please enter a valid 6-digit code' });
		}

		try {
			// Call Better Auth's two-factor enable endpoint directly
			const baseURL = event.url.origin;
			const response = await fetch(`${baseURL}/api/auth/two-factor/enable`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...Object.fromEntries(event.request.headers.entries())
				},
				body: JSON.stringify({ code })
			});

			if (!response.ok) {
				const error = await response.text();
				if (process.env.NODE_ENV === 'development') {
					console.error('2FA verify error:', error);
				}

				if (response.status === 400) {
					return fail(400, { error: 'Invalid verification code' });
				}

				return fail(response.status, { error: 'Failed to verify code. Please try again.' });
			}

			return {
				success: true,
				message: '2FA enabled successfully'
			};
		} catch (error: any) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Verify 2FA error:', error);
			}
			return fail(500, { error: 'Failed to verify code. Please try again.' });
		}
	},

	disableTwoFactor: async (event) => {
		if (!event.locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await event.request.formData();
		const password = formData.get('password')?.toString();

		if (!password) {
			return fail(400, { error: 'Password is required' });
		}

		try {
			// Call Better Auth's two-factor disable endpoint directly
			const baseURL = event.url.origin;
			const response = await fetch(`${baseURL}/api/auth/two-factor/disable`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...Object.fromEntries(event.request.headers.entries())
				},
				body: JSON.stringify({ password })
			});

			if (!response.ok) {
				const error = await response.text();
				if (process.env.NODE_ENV === 'development') {
					console.error('2FA disable error:', error);
				}

				if (response.status === 401) {
					return fail(400, { error: 'Incorrect password' });
				}

				return fail(response.status, { error: 'Failed to disable 2FA. Please try again.' });
			}

			return {
				success: true,
				message: '2FA disabled successfully'
			};
		} catch (error: any) {
			if (process.env.NODE_ENV === 'development') {
				console.error('Disable 2FA error:', error);
			}
			return fail(500, { error: 'Failed to disable 2FA. Please try again.' });
		}
	},

	deleteAccount: async (event) => {
		if (!event.locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await event.request.formData();
		const password = formData.get('password')?.toString();

		if (!password) {
			return fail(400, { error: 'Password is required to delete your account' });
		}

		try {
			// Use Better Auth's built-in deleteUser API
			// This will:
			// 1. Verify the password
			// 2. Call beforeDelete hook (which deletes files)
			// 3. Delete user from database (cascade deletes sessions, accounts, etc.)
			// 4. Sign out and clear all cookies
			await auth.api.deleteUser({
				body: {
					password
				},
				headers: event.request.headers
			});

			// Redirect to account deleted confirmation page
			throw redirect(303, '/account-deleted');
		} catch (error: any) {
			// Check if it's our redirect
			if (error?.status === 303) {
				throw error;
			}

			// Check if it's a password verification error from Better Auth
			if (error?.status === 401 || error?.message?.toLowerCase().includes('password')) {
				return fail(400, { error: 'Incorrect password' });
			}

			if (process.env.NODE_ENV === 'development') {
				console.error('Delete account error:', error);
			}
			return fail(500, { error: 'Failed to delete account. Please try again.' });
		}
	},

} satisfies Actions;
