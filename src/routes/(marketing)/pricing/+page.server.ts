import type { PageServerLoad } from './$types';
import { TIER_PRICING } from '$lib/server/pricing/constants';

export const load: PageServerLoad = async () => {
	return {
		pricing: TIER_PRICING
	};
};
