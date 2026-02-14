import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { impersonationLog } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ cookies }) => {
	const impersonationCookie = cookies.get('impersonation');

	if (!impersonationCookie) {
		return json({ error: 'Not impersonating' }, { status: 400 });
	}

	try {
		const impersonation = JSON.parse(impersonationCookie);

		// Update the impersonation log with end time
		if (impersonation.logId) {
			await db
				.update(impersonationLog)
				.set({ endedAt: new Date() })
				.where(eq(impersonationLog.id, impersonation.logId));
		}

		// Clear the impersonation cookie
		cookies.delete('impersonation', { path: '/' });

		return json({ success: true });
	} catch (error) {
		// Clear cookie even on error
		cookies.delete('impersonation', { path: '/' });
		return json({ error: 'Failed to end impersonation' }, { status: 500 });
	}
};
