<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Crown, TrendingUp, Zap } from 'lucide-svelte';

	interface Props {
		tier: 'free' | 'pro' | 'business';
	}

	let { tier }: Props = $props();

	const tierColors = {
		free: 'bg-gray-100 text-gray-800 border-gray-300',
		pro: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-purple-300',
		business: 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-900 border-amber-600'
	};

	const tierNames = {
		free: 'Free',
		pro: 'Pro',
		business: 'Business'
	};
</script>

<Badge variant="outline" class="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold {tierColors[tier]}">
	{#if tier === 'free'}
		<TrendingUp class="size-4!" />
	{:else if tier === 'pro'}
		<Crown class="size-4!" />
	{:else}
	<Zap class="size-4!" />
	{/if}
	{tierNames[tier]} Plan
</Badge>
