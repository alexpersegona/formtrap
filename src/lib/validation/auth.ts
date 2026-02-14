/**
 * Shared validation schemas for authentication and user management
 * These schemas are used on both client and server for consistent validation
 */

import * as v from 'valibot';

/**
 * Registration schema
 */
export const registerSchema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Name is required')),
	email: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, 'Email is required'),
		v.email('Invalid email address')
	),
	password: v.pipe(v.string(), v.minLength(8, 'Password must be at least 8 characters')),
	confirmPassword: v.pipe(v.string(), v.minLength(1, 'Please confirm your password'))
});

export type RegisterInput = v.InferInput<typeof registerSchema>;
export type RegisterOutput = v.InferOutput<typeof registerSchema>;

/**
 * Profile update schema
 */
export const profileSchema = v.object({
	name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Name is required')),
	email: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, 'Email is required'),
		v.email('Invalid email address')
	)
});

export type ProfileInput = v.InferInput<typeof profileSchema>;
export type ProfileOutput = v.InferOutput<typeof profileSchema>;

/**
 * Change password schema
 */
export const changePasswordSchema = v.object({
	currentPassword: v.pipe(v.string(), v.minLength(1, 'Current password is required')),
	newPassword: v.pipe(v.string(), v.minLength(8, 'New password must be at least 8 characters')),
	confirmNewPassword: v.pipe(v.string(), v.minLength(1, 'Please confirm your new password'))
});

export type ChangePasswordInput = v.InferInput<typeof changePasswordSchema>;
export type ChangePasswordOutput = v.InferOutput<typeof changePasswordSchema>;

/**
 * Validation helper functions
 */

export function validateRegister(data: unknown) {
	return v.safeParse(registerSchema, data);
}

export function validateProfile(data: unknown) {
	return v.safeParse(profileSchema, data);
}

export function validateChangePassword(data: unknown) {
	return v.safeParse(changePasswordSchema, data);
}

/**
 * Field-level validation for real-time feedback
 */

export function validatePasswordStrength(password: string): string {
	if (password.length === 0) return '';
	if (password.length < 8) return 'Password must be at least 8 characters';
	return '';
}

export function validatePasswordMatch(password: string, confirmPassword: string): string {
	if (confirmPassword.length === 0) return '';
	if (password !== confirmPassword) return 'Passwords do not match';
	return '';
}

export function validateEmail(email: string): string {
	if (email.length === 0) return '';
	const emailResult = v.safeParse(v.pipe(v.string(), v.email()), email);
	if (!emailResult.success) return 'Invalid email address';
	return '';
}

export function validateRequired(value: string, fieldName: string): string {
	if (!value.trim()) return `${fieldName} is required`;
	return '';
}
