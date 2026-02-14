import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Role } from '$lib/types/auth';

/**
 * Require user to be authenticated
 * @throws redirect to /login if not authenticated
 * @returns The authenticated user
 */
export function requireAuth(event: RequestEvent) {
	if (!event.locals.user) {
		throw redirect(303, '/login');
	}
	return event.locals.user;
}

/**
 * Require user to have a specific role or roles
 * @throws redirect to /login if not authenticated
 * @throws error 403 if user doesn't have required role
 * @returns The authenticated user with required role
 */
export function requireRole(event: RequestEvent, role: Role | Role[]) {
	const user = requireAuth(event);
	const roles = Array.isArray(role) ? role : [role];

	if (!roles.includes(user.role)) {
		throw error(403, `Forbidden - Requires role: ${roles.join(' or ')}`);
	}

	return user;
}

/**
 * Require user to have ANY of the specified roles
 * @throws redirect to /login if not authenticated
 * @throws error 403 if user doesn't have any of the required roles
 * @returns The authenticated user
 */
export function requireAnyRole(event: RequestEvent, roles: Role[]) {
	const user = requireAuth(event);

	if (!roles.includes(user.role)) {
		throw error(403, `Forbidden - Requires one of: ${roles.join(', ')}`);
	}

	return user;
}

/**
 * Require user to own a resource or be a superadmin
 * @throws redirect to /login if not authenticated
 * @throws error 403 if user doesn't own resource and is not superadmin
 * @returns The authenticated user
 */
export function requireOwnership(event: RequestEvent, resourceOwnerId: string) {
	const user = requireAuth(event);

	// Superadmins can access anything
	if (user.role === 'superadmin') {
		return user;
	}

	// Check ownership
	if (user.id !== resourceOwnerId) {
		throw error(403, 'You do not have permission to access this resource');
	}

	return user;
}

/**
 * Check if user is authenticated (non-throwing)
 * @returns true if user is authenticated, false otherwise
 */
export function isAuthenticated(event: RequestEvent): boolean {
	return event.locals.user !== null;
}

/**
 * Check if user has a specific role (non-throwing)
 * @returns true if user has the role, false otherwise
 */
export function hasRole(event: RequestEvent, role: Role | Role[]): boolean {
	if (!event.locals.user) return false;

	const roles = Array.isArray(role) ? role : [role];
	return roles.includes(event.locals.user.role);
}

/**
 * Check if user has ANY of the specified roles (non-throwing)
 * @returns true if user has any of the roles, false otherwise
 */
export function hasAnyRole(event: RequestEvent, roles: Role[]): boolean {
	if (!event.locals.user) return false;
	return roles.includes(event.locals.user.role);
}

/**
 * Require user to be a superadmin
 * @throws redirect to /login if not authenticated
 * @throws error 403 if user is not superadmin
 * @returns The authenticated superadmin user
 */
export function requireSuperadmin(event: RequestEvent) {
	return requireRole(event, 'superadmin');
}

/**
 * Check if user is a superadmin (non-throwing)
 * @returns true if user is superadmin, false otherwise
 */
export function isSuperadmin(event: RequestEvent): boolean {
	return hasRole(event, 'superadmin');
}
