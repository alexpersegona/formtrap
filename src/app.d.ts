// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, User } from 'better-auth/types';
import type { Role } from '$lib/types/auth';

// Extend the User type to include role
export interface AppUser extends User {
	role: Role;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: Session | null;
			user: AppUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
