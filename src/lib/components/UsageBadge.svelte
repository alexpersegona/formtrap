<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { AlertCircle } from 'lucide-svelte';

	interface Props {
		/**
		 * Label for the usage metric
		 * Example: "Submissions", "Storage", "Spaces"
		 */
		label: string;

		/**
		 * Current usage amount
		 */
		current: number;

		/**
		 * Maximum allowed (limit)
		 * Use -1 for unlimited
		 */
		max: number;

		/**
		 * Unit of measurement
		 * Example: "MB", "GB", "submissions"
		 */
		unit?: string;

		/**
		 * Display variant
		 * - 'full': Shows label, progress bar, and numbers
		 * - 'compact': Shows only progress bar and numbers
		 * - 'minimal': Shows only numbers
		 */
		variant?: 'full' | 'compact' | 'minimal';

		/**
		 * Optional link to usage dashboard
		 */
		dashboardLink?: string;

		/**
		 * Show warning icon when in danger zone (> 90%)
		 */
		showWarning?: boolean;

		/**
		 * Optional class for styling
		 */
		class?: string;
	}

	let {
		label,
		current,
		max,
		unit = '',
		variant = 'full',
		dashboardLink,
		showWarning = true,
		class: className
	}: Props = $props();

	// Calculate percentage
	const percentage = $derived(max === -1 ? 0 : Math.min((current / max) * 100, 100));

	// Determine color based on usage
	const color = $derived.by(() => {
		if (max === -1) return 'green'; // Unlimited
		if (percentage < 70) return 'green';
		if (percentage < 90) return 'yellow';
		return 'red';
	});

	// Format numbers for display
	const formatNumber = (num: number) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toString();
	};

	// Get display text
	const displayCurrent = $derived(formatNumber(current));
	const displayMax = $derived(max === -1 ? '∞' : formatNumber(max));

	// Determine if in danger zone
	const isDanger = $derived(percentage >= 90 && max !== -1);

	// Color classes for different states
	const progressColorClass = $derived.by(() => {
		if (color === 'green') return 'bg-green-500';
		if (color === 'yellow') return 'bg-yellow-500';
		return 'bg-red-500';
	});

	const textColorClass = $derived.by(() => {
		if (color === 'green') return 'text-green-700 dark:text-green-400';
		if (color === 'yellow') return 'text-yellow-700 dark:text-yellow-400';
		return 'text-red-700 dark:text-red-400';
	});
</script>

{#if variant === 'minimal'}
	<!-- Minimal variant: Just numbers -->
	<div class={className}>
		<span class="text-sm {textColorClass}">
			{displayCurrent}
			{#if unit}{unit}{/if}
			/ {displayMax}
			{#if unit && max !== -1}{unit}{/if}
		</span>
	</div>
{:else}
	<!-- Full or Compact variant -->
	<div class={className}>
		{#if variant === 'full'}
			<div class="mb-1 flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">{label}</span>
				<div class="flex items-center gap-1">
					{#if isDanger && showWarning}
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<AlertCircle class="h-4 w-4 text-red-500" />
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>You're approaching your {label.toLowerCase()} limit</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{/if}
					<span class="text-sm {textColorClass}">
						{displayCurrent} / {displayMax}
						{#if unit}{unit}{/if}
					</span>
				</div>
			</div>
		{/if}

		<!-- Progress bar or dotted line for unlimited -->
		{#if max === -1}
			<!-- Dotted line for unlimited resources -->
			<div class="relative h-2 w-full flex items-center">
				<div class="w-full border-t-2 border-dotted border-muted-foreground/30"></div>
			</div>
		{:else}
			<!-- Progress bar -->
			<div class="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
				<div
					class="h-full rounded-full transition-all {progressColorClass}"
					style="width: {percentage}%"
				></div>
			</div>
		{/if}

		{#if variant === 'compact'}
			<div class="mt-1 flex items-center justify-between">
				<span class="text-xs text-muted-foreground">{label}</span>
				<span class="text-xs {textColorClass}">
					{displayCurrent} / {displayMax}
					{#if unit}{unit}{/if}
				</span>
			</div>
		{/if}

		<!-- Optional dashboard link -->
		{#if dashboardLink && variant === 'full'}
			<a
				href={dashboardLink}
				class="mt-1 block text-xs text-muted-foreground hover:text-foreground hover:underline"
			>
				View details →
			</a>
		{/if}
	</div>
{/if}
