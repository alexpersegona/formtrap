// Role definitions
export const ROLES = ['user', 'admin'] as const;
export type Role = typeof ROLES[number];

// Helper to check if a string is a valid role
export function isValidRole(role: string): role is Role {
	return ROLES.includes(role as Role);
}

// Helper to check if user has required role
export function hasRole(userRole: Role, requiredRole: Role | Role[]): boolean {
	const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
	return required.includes(userRole);
}

// Admin check helper
export function isAdmin(userRole: Role): boolean {
	return userRole === 'admin';
}
