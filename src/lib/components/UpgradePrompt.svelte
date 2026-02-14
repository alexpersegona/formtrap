<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowUpCircle, Crown } from 'lucide-svelte';
	import type { SubscriptionTier } from '$lib/server/pricing/constants';

	interface Props {
		/**
		 * Name of the feature that's locked
		 * Example: "Webhooks", "API Access", "Advanced Filters"
		 */
		featureName: string;

		/**
		 * User's current tier
		 */
		currentTier: SubscriptionTier;

		/**
		 * Minimum tier required for this feature
		 */
		requiredTier: SubscriptionTier;

		/**
		 * Optional description of what the feature does
		 */
		description?: string;

		/**
		 * Display variant
		 * - 'card': Full card with border and padding (default)
		 * - 'inline': Compact inline message
		 * - 'banner': Wide banner style
		 */
		variant?: 'card' | 'inline' | 'banner';

		/**
		 * Optional custom upgrade link (defaults to /pricing)
		 */
		upgradeLink?: string;

		/**
		 * Optional class for styling
		 */
		class?: string;
	}

	let {
		featureName,
		currentTier,
		requiredTier,
		description,
		variant = 'card',
		upgradeLink = '/pricing',
		class: className
	}: Props = $props();

	// Format tier name for display
	const formatTier = (tier: string) => {
		return tier.charAt(0).toUpperCase() + tier.slice(1);
	};
</script>

{#if variant === 'card'}
	<Card.Root class={className}>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Crown class="h-5 w-5 text-amber-500" />
				{featureName} - Premium Feature
			</Card.Title>
			{#if description}
				<Card.Description>{description}</Card.Description>
			{/if}
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="rounded-lg bg-muted p-4">
				<p class="text-sm text-muted-foreground">
					<strong>Current Plan:</strong>
					{formatTier(currentTier)}
				</p>
				<p class="text-sm text-muted-foreground">
					<strong>Required:</strong>
					{formatTier(requiredTier)} or higher
				</p>
			</div>

			<p class="text-sm text-muted-foreground">
				Upgrade your plan to unlock {featureName} and other premium features.
			</p>

			<Button href={upgradeLink} variant="fancy" class="w-full" tracking>
				<ArrowUpCircle class="mr-2 h-4 w-4" />
				Upgrade to {formatTier(requiredTier)}
			</Button>
		</Card.Content>
	</Card.Root>
{:else if variant === 'inline'}
	<div
		class="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200 {className ||
			''}"
	>
		<Crown class="h-4 w-4" />
		<span>
			<strong>{featureName}</strong> requires {formatTier(requiredTier)}
		</span>
		<Button href={upgradeLink} variant="link" size="sm" class="h-auto p-0 text-amber-900 dark:text-amber-100">
			Upgrade
		</Button>
	</div>
{:else if variant === 'banner'}
	<div
		class="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950 {className ||
			''}"
	>
		<div class="flex items-start gap-3">
			<Crown class="mt-0.5 h-5 w-5 text-amber-500" />
			<div>
				<p class="font-medium text-amber-900 dark:text-amber-100">
					{featureName} - Premium Feature
				</p>
				<p class="text-sm text-amber-800 dark:text-amber-200">
					{#if description}
						{description}
					{:else}
						Upgrade to {formatTier(requiredTier)} to unlock this feature.
					{/if}
				</p>
			</div>
		</div>
		<Button href={upgradeLink} variant="outline" size="sm">
			<ArrowUpCircle class="mr-2 h-4 w-4" />
			Upgrade
		</Button>
	</div>
{/if}
