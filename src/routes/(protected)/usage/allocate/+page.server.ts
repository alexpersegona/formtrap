import type { PageServerLoad, Actions } from './$types';
import { getUserSubscription } from '$lib/server/pricing/limits';
import { getUserSpaceAllocations, updateSpaceAllocations } from '$lib/server/pricing/allocations';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user.id;
	const subscription = await getUserSubscription(userId);

	// Feature gate: Pro/Business only
	if (subscription.tier === 'free') {
		throw redirect(303, '/usage');
	}

	const allocations = await getUserSpaceAllocations(userId);

	return {
		subscription,
		allocations,
		pageHeader: {
			backHref: '/usage',
			backLabel: 'Back to Usage'
		}
	};
};

export const actions = {
	updateAllocations: async ({ request, locals }) => {
		const userId = locals.user.id;
		const subscription = await getUserSubscription(userId);

		// Feature gate: Pro/Business only
		if (subscription.tier === 'free') {
			return fail(403, { error: 'This feature requires a Pro or Business plan' });
		}

		const formData = await request.formData();
		const allocationsJson = formData.get('allocations');

		if (!allocationsJson || typeof allocationsJson !== 'string') {
			return fail(400, { error: 'Invalid allocation data' });
		}

		let allocations;
		try {
			allocations = JSON.parse(allocationsJson);
		} catch {
			return fail(400, { error: 'Invalid allocation data format' });
		}

		const result = await updateSpaceAllocations(userId, allocations);

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		throw redirect(303, '/usage');
	},

	resetToAuto: async ({ locals }) => {
		const userId = locals.user.id;
		const subscription = await getUserSubscription(userId);

		// Feature gate: Pro/Business only
		if (subscription.tier === 'free') {
			return fail(403, { error: 'This feature requires a Pro or Business plan' });
		}

		const { resetToAutoSplit } = await import('$lib/server/pricing/allocations');
		await resetToAutoSplit(userId);

		throw redirect(303, '/usage');
	}
} satisfies Actions;
