import type { Actions, PageServerLoad } from './$types';
import { getUserSubscription } from '$lib/server/pricing/limits';
import { db } from '$lib/server/db';
import { subscription } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user.id;
	const subscriptionData = await getUserSubscription(userId);

	return {
		subscription: subscriptionData
	};
};

export const actions = {
	updateOverageMode: async ({ request, locals }) => {
		const userId = locals.user.id;
		const formData = await request.formData();
		const overageMode = formData.get('overageMode')?.toString();

		// Validate overage mode
		if (!overageMode || (overageMode !== 'pause' && overageMode !== 'auto_bill')) {
			return fail(400, { error: 'Invalid overage mode' });
		}

		// Get user's subscription
		const userSub = await getUserSubscription(userId);

		// Only Pro and Business users can change this setting
		if (userSub.tier === 'free') {
			return fail(403, { error: 'Upgrade to Pro or Business to change overage settings' });
		}

		// Update subscription overage mode
		await db
			.update(subscription)
			.set({ overageMode: overageMode as 'pause' | 'auto_bill' })
			.where(eq(subscription.userId, userId));

		return { success: true };
	}
} satisfies Actions;
