import { createAuthClient } from 'better-auth/svelte';
import { twoFactorClient, organizationClient } from 'better-auth/client/plugins';
import { browser } from '$app/environment';

export const authClient = createAuthClient({
	baseURL: browser
		? window.location.origin
		: import.meta.env.VITE_BETTER_AUTH_URL || 'http://localhost:5173',
	plugins: [twoFactorClient(), organizationClient()]
});

export const {
	signIn,
	signUp,
	signOut,
	useSession,
	twoFactor,
	organization
} = authClient;
