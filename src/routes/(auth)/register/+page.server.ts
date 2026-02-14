import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as v from 'valibot';
import { throttleRegister } from '$lib/server/rate-limit';
import { registerSchema } from '$lib/validation/auth';

export const actions = {
	default: async (event) => {
		console.log('=== REGISTRATION START ===');

		// Apply rate limiting (IP-based to prevent spam)
		console.log('Checking rate limit...');
		const rateLimit = await throttleRegister(event);
		if (!rateLimit.allowed) {
			const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString();
			console.log('Rate limit exceeded');
			return fail(429, {
				error: `Too many registration attempts. Please try again after ${resetTime}.`
			});
		}
		console.log('Rate limit OK');

		const formData = await event.request.formData();
		const data = {
			name: formData.get('name'),
			email: formData.get('email'),
			password: formData.get('password'),
			confirmPassword: formData.get('confirmPassword')
		};
		console.log('Form data received:', { ...data, password: '***', confirmPassword: '***' });

		// Validate with Valibot
		console.log('Validating form data...');
		const result = v.safeParse(registerSchema, data);

		if (!result.success) {
			console.log('Validation failed:', result.issues);
			const errors: Record<string, string> = {};
			for (const issue of result.issues) {
				if (issue.path) {
					const key = issue.path[0].key as string;
					errors[key] = issue.message;
				}
			}
			return fail(400, { errors });
		}
		console.log('Validation passed');

		// Check passwords match
		console.log('Checking password match...');
		if (result.output.password !== result.output.confirmPassword) {
			console.log('Passwords do not match');
			return fail(400, {
				errors: {
					confirmPassword: 'Passwords do not match'
				}
			});
		}
		console.log('Passwords match');

		// Check if email already exists
		console.log('Checking for existing user with email:', result.output.email);
		const existingUser = await db.query.user.findFirst({
			where: eq(userTable.email, result.output.email)
		});

		if (existingUser) {
			console.log('User already exists');
			return fail(400, {
				errors: {
					email: 'Email is already registered'
				}
			});
		}
		console.log('User does not exist, proceeding with Better Auth signup...');

		try {
			// Use Better Auth's server-side API for signup
			// Note: autoSignIn is enabled by default, so user is automatically logged in
			console.log('Calling Better Auth signUpEmail (with auto-login)...');
			const signupResult = await auth.api.signUpEmail({
				body: {
					email: result.output.email,
					password: result.output.password,
					name: result.output.name
				},
				headers: event.request.headers
			});
			console.log('Registration and auto-login completed successfully');
			console.log('Signup result:', signupResult);
		} catch (error) {
			// Log error in development only
			if (process.env.NODE_ENV === 'development') {
				console.error('Registration error:', error);
			}
			return fail(500, {
				error: 'Failed to create account. Please try again.'
			});
		}

		// Redirect to email verification page
		console.log('Registration complete, redirecting to verify-email page');
		throw redirect(303, '/verify-email');
	}
} satisfies Actions;
