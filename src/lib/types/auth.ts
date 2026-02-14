// Role definitions
// - user: Regular platform user (free or paid)
// - superadmin: Platform owner with full access to /superadmin/*
export const ROLES = ['user', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];

// Helper to check if a string is a valid role
export function isValidRole(role: string): role is Role {
	return ROLES.includes(role as Role);
}

// Helper to check if user has required role
export function hasRole(userRole: Role, requiredRole: Role | Role[]): boolean {
	const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
	return required.includes(userRole);
}

// Superadmin check helper
export function isSuperadmin(userRole: Role): boolean {
	return userRole === 'superadmin';
}
