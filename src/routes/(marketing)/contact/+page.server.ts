import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { rateLimit } from '$lib/server/rate-limit';
import { sendContactFormEmail } from '$lib/server/email';
import { db } from '$lib/server/db';
import { contactSubmission } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';
import type { Actions } from './$types';

const VALID_SUBJECTS = ['General Inquiry', 'Support Issue', 'Feature Request'] as const;

export const actions = {
	default: async (event) => {
		const { request } = event;
		const data = await request.formData();

		const name = data.get('name')?.toString().trim() ?? '';
		const email = data.get('email')?.toString().trim() ?? '';
		const subject = data.get('subject')?.toString().trim() ?? '';
		const message = data.get('message')?.toString().trim() ?? '';
		const turnstileToken = data.get('cf-turnstile-response')?.toString() ?? '';

		const values = { name, email, subject, message };
		const errors: Record<string, string> = {};

		// Validate fields
		if (!name) {
			errors.name = 'Name is required';
		}

		if (!email) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = 'Please enter a valid email address';
		}

		if (!subject) {
			errors.subject = 'Please select a subject';
		} else if (!VALID_SUBJECTS.includes(subject as (typeof VALID_SUBJECTS)[number])) {
			errors.subject = 'Please select a valid subject';
		}

		if (!message) {
			errors.message = 'Message is required';
		} else if (message.length < 15) {
			errors.message = 'Message must be at least 15 characters';
		} else if (message.length > 500) {
			errors.message = 'Message must be 500 characters or less';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, { errors, values });
		}

		// Verify Turnstile token
		if (!turnstileToken) {
			errors.turnstile = 'Please complete the CAPTCHA verification';
			return fail(400, { errors, values });
		}

		const turnstileSecret = env.TURNSTILE_SECRET_KEY;
		if (turnstileSecret) {
			const verifyResponse = await fetch(
				'https://challenges.cloudflare.com/turnstile/v0/siteverify',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						secret: turnstileSecret,
						response: turnstileToken,
						remoteip: event.getClientAddress()
					})
				}
			);

			const verifyResult = await verifyResponse.json();

			if (!verifyResult.success) {
				errors.turnstile = 'CAPTCHA verification failed. Please try again.';
				return fail(400, { errors, values });
			}
		}

		// Rate limiting
		const rateLimitResult = await rateLimit(event, {
			identifier: 'ip',
			limit: 5,
			windowMs: 60 * 60 * 1000, // 1 hour
			prefix: 'ratelimit:contact'
		});

		if (!rateLimitResult.allowed) {
			errors.form = 'Too many submissions. Please try again later.';
			return fail(429, { errors, values });
		}

		// Store submission in database
		try {
			await db.insert(contactSubmission).values({
				id: nanoid(),
				name,
				email,
				subject,
				message,
				ipAddress: event.getClientAddress()
			});
		} catch (dbError) {
			console.error('Failed to store contact submission:', dbError);
			// Continue with email even if DB fails
		}

		// Send email
		try {
			await sendContactFormEmail({ name, email, subject, message });
		} catch (error) {
			console.error('Failed to send contact form email:', error);
			errors.form = 'Failed to send your message. Please try again later.';
			return fail(500, { errors, values });
		}

		return { success: true };
	}
} satisfies Actions;
