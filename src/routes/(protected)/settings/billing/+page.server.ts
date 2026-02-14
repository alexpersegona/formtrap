import type { PageServerLoad } from './$types';
import { getUserSubscription } from '$lib/server/pricing/subscription';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user.id;
	const subscriptionData = await getUserSubscription(userId);

	return {
		subscription: subscriptionData
	};
};
