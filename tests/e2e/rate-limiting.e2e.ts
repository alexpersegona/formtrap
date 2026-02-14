/**
 * E2E Tests for Rate Limiting
 *
 * Run with: bun run test:e2e
 * NOT with: bun test (uses Bun's test runner)
 * NOT with: bun run test:unit (uses Vitest)
 */
import { test, expect } from 'playwright/test';

test.describe('Rate Limiting', () => {
	test.beforeEach(async ({ request }) => {
		// Clear Redis before each test
		// Note: In a real setup, you'd have a test API endpoint to clear Redis
		// For now, this assumes you have redis-cli available
	});

	test.describe('Login Rate Limiting', () => {
		test('should show rate limit error after 5 failed login attempts', async ({ page }) => {
			await page.goto('/login');

			// Attempt to login 5 times with wrong credentials
			for (let i = 0; i < 5; i++) {
				await page.getByLabel('Email').fill('test@example.com');
				await page.getByLabel('Password').fill('wrongpassword');
				await page.getByRole('button', { name: 'Sign in' }).click();

				// Wait for response
				await page.waitForTimeout(500);
			}

			// 6th attempt should show rate limit error
			await page.getByLabel('Email').fill('test@example.com');
			await page.getByLabel('Password').fill('wrongpassword');
			await page.getByRole('button', { name: 'Sign in' }).click();

			// Should show rate limit error message
			await expect(page.getByText(/too many login attempts/i)).toBeVisible();
		});
	});

	test.describe('Forgot Password Rate Limiting', () => {
		test('should show rate limit toast after 3 password reset requests', async ({ page }) => {
			await page.goto('/forgot-password');

			// Make 3 password reset requests
			for (let i = 0; i < 3; i++) {
				await page.getByLabel('Email').fill('test@example.com');
				await page.getByRole('button', { name: 'Send Reset Link' }).click();

				// Wait for the success toast to appear and disappear
				await expect(page.getByText('Password reset email sent')).toBeVisible();
				await page.waitForTimeout(1000);
			}

			// 4th attempt should show rate limit error
			await page.getByLabel('Email').fill('test@example.com');
			await page.getByRole('button', { name: 'Send Reset Link' }).click();

			// Should show rate limit toast
			await expect(page.getByText(/too many requests/i)).toBeVisible();
		});

		test('should rate limit based on IP + email combination', async ({ page }) => {
			await page.goto('/forgot-password');

			// Make 3 requests for email1
			for (let i = 0; i < 3; i++) {
				await page.getByLabel('Email').fill('email1@example.com');
				await page.getByRole('button', { name: 'Send Reset Link' }).click();
				await page.waitForTimeout(500);
			}

			// 4th request for email1 should be rate limited
			await page.getByLabel('Email').fill('email1@example.com');
			await page.getByRole('button', { name: 'Send Reset Link' }).click();
			await expect(page.getByText(/too many requests/i)).toBeVisible();

			// But a request for email2 should still work (different email)
			await page.reload();
			await page.getByLabel('Email').fill('email2@example.com');
			await page.getByRole('button', { name: 'Send Reset Link' }).click();
			await expect(page.getByText('Password reset email sent')).toBeVisible();
		});
	});

	test.describe('API Endpoints', () => {
		test('login endpoint should return 429 after rate limit', async ({ request }) => {
			// Make 5 login attempts
			for (let i = 0; i < 5; i++) {
				await request.post('/api/auth/sign-in/email', {
					data: {
						email: 'test@example.com',
						password: 'wrongpassword'
					}
				});
			}

			// 6th attempt should return 429
			const response = await request.post('/api/auth/sign-in/email', {
				data: {
					email: 'test@example.com',
					password: 'wrongpassword'
				}
			});

			expect(response.status()).toBe(429);

			const body = await response.json();
			expect(body).toHaveProperty('error');
			expect(body.error).toContain('Too many login attempts');
			expect(body).toHaveProperty('resetAt');
		});

		test('register endpoint should return 429 after rate limit', async ({ request }) => {
			// Make 3 registration attempts
			for (let i = 0; i < 3; i++) {
				await request.post('/api/auth/sign-up/email', {
					data: {
						email: `test${i}@example.com`,
						password: 'password123',
						name: 'Test User'
					}
				});
			}

			// 4th attempt should return 429
			const response = await request.post('/api/auth/sign-up/email', {
				data: {
					email: 'test@example.com',
					password: 'password123',
					name: 'Test User'
				}
			});

			expect(response.status()).toBe(429);

			const body = await response.json();
			expect(body.error).toContain('Too many registration attempts');
		});

		test('forgot password endpoint should return 429 after rate limit', async ({ request }) => {
			// Make 3 forgot password requests
			for (let i = 0; i < 3; i++) {
				await request.post('/api/auth/forget-password', {
					data: {
						email: 'test@example.com',
						redirectTo: '/reset-password'
					}
				});
			}

			// 4th attempt should return 429
			const response = await request.post('/api/auth/forget-password', {
				data: {
					email: 'test@example.com',
					redirectTo: '/reset-password'
				}
			});

			expect(response.status()).toBe(429);

			const body = await response.json();
			expect(body.error).toContain('Too many password reset requests');
		});

		test('reset password endpoint should return 429 after rate limit', async ({ request }) => {
			// Make 5 reset password attempts
			for (let i = 0; i < 5; i++) {
				await request.post('/api/auth/reset-password', {
					data: {
						newPassword: 'newpassword123',
						token: 'invalid-token'
					}
				});
			}

			// 6th attempt should return 429
			const response = await request.post('/api/auth/reset-password', {
				data: {
					newPassword: 'newpassword123',
					token: 'invalid-token'
				}
			});

			expect(response.status()).toBe(429);

			const body = await response.json();
			expect(body.error).toContain('Too many password reset attempts');
		});
	});

	test.describe('Error Messages', () => {
		test('should display user-friendly error messages', async ({ page }) => {
			await page.goto('/login');

			// Trigger rate limit
			for (let i = 0; i < 6; i++) {
				await page.getByLabel('Email').fill('test@example.com');
				await page.getByLabel('Password').fill('wrong');
				await page.getByRole('button', { name: 'Sign in' }).click();
				await page.waitForTimeout(300);
			}

			// Check that the error message is user-friendly (not technical)
			const errorMessage = await page.getByText(/too many login attempts/i);
			await expect(errorMessage).toBeVisible();

			// Should not contain technical jargon
			await expect(page.getByText(/429/i)).not.toBeVisible();
			await expect(page.getByText(/rate limit/i)).not.toBeVisible();
		});
	});
});
