<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import UsageBadge from '$lib/components/UsageBadge.svelte';
	import UpgradePrompt from '$lib/components/UpgradePrompt.svelte';
	import TierBadge from '$lib/components/TierBadge.svelte';
	import { Database, FileText, Settings, ExternalLink } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Sorting state
	type SortOption = 'usage-desc' | 'usage-asc' | 'name-asc' | 'name-desc';
	let sortBy = $state<SortOption>('usage-desc');

	// Get label for selected sort option
	const sortLabels = {
		'usage-desc': 'Highest Usage First',
		'usage-asc': 'Lowest Usage First',
		'name-asc': 'Name (A-Z)',
		'name-desc': 'Name (Z-A)'
	};
	let selectedSortLabel = $derived(sortLabels[sortBy]);

	// Sorted spaces list
	let sortedSpaces = $derived.by(() => {
		const spaces = [...data.spaceUsages];
		switch (sortBy) {
			case 'usage-desc':
				return spaces.sort((a, b) => {
					const aMax = Math.max(
						(a.usedStorageMb / a.allocatedStorageMb) * 100,
						(a.submissionsThisMonth / a.allocatedSubmissionsPerMonth) * 100
					);
					const bMax = Math.max(
						(b.usedStorageMb / b.allocatedStorageMb) * 100,
						(b.submissionsThisMonth / b.allocatedSubmissionsPerMonth) * 100
					);
					return bMax - aMax;
				});
			case 'usage-asc':
				return spaces.sort((a, b) => {
					const aMax = Math.max(
						(a.usedStorageMb / a.allocatedStorageMb) * 100,
						(a.submissionsThisMonth / a.allocatedSubmissionsPerMonth) * 100
					);
					const bMax = Math.max(
						(b.usedStorageMb / b.allocatedStorageMb) * 100,
						(b.submissionsThisMonth / b.allocatedSubmissionsPerMonth) * 100
					);
					return aMax - bMax;
				});
			case 'name-asc':
				return spaces.sort((a, b) => a.spaceName.localeCompare(b.spaceName));
			case 'name-desc':
				return spaces.sort((a, b) => b.spaceName.localeCompare(a.spaceName));
			default:
				return spaces;
		}
	});

	// Show scrollable container when there are 6+ spaces
	const showScrollContainer = $derived(sortedSpaces.length >= 6);

	// Auto-hide scrollbar on scroll
	let scrollContainer: HTMLDivElement;
	let isScrolling = $state(false);
	let scrollTimeout: ReturnType<typeof setTimeout>;

	function handleScroll() {
		isScrolling = true;
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			isScrolling = false;
		}, 300);
	}

	$effect(() => {
		if (scrollContainer && showScrollContainer) {
			scrollContainer.addEventListener('scroll', handleScroll);
			return () => {
				scrollContainer.removeEventListener('scroll', handleScroll);
				clearTimeout(scrollTimeout);
			};
		}
	});
</script>

<svelte:head>
	<title>Usage & Limits - Form Capture Platform</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Header with Tier Badge -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="mb-2 text-3xl font-bold">Usage & Limits</h1>
			<p class="text-muted-foreground">Monitor your plan usage and quotas</p>
		</div>
		<TierBadge tier={data.subscription.tier} />
	</div>

	<!-- Overall Usage Metrics -->
	<div class="mb-8 grid gap-4 lg:grid-cols-3">
		<!-- Spaces -->
		<Card.Root class="flex flex-col">
			<Card.Header class="pb-3">
				<Card.Title class="flex items-start gap-2 text-base">
					<Database class="h-4 w-4 flex-shrink-0 mt-1" />
					Spaces
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex-grow"></Card.Content>
			<Card.Footer class="pt-0 block">
				<UsageBadge
					label="Spaces"
					current={data.usage.currentSpaces}
					max={data.usage.maxSpaces}
					variant="full"
					showWarning={true}
				/>
			</Card.Footer>
		</Card.Root>

		<!-- Submissions -->
		<Card.Root class="flex flex-col">
			<Card.Header class="pb-3">
				<Card.Title class="flex items-start gap-2 text-base">
					<FileText class="h-4 w-4 flex-shrink-0 mt-1" />
					Submissions This Month
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex-grow"></Card.Content>
			<Card.Footer class="pt-0 block">
				<UsageBadge
					label="Submissions"
					current={data.usage.submissionsThisMonth}
					max={data.usage.maxSubmissionsPerMonth}
					variant="full"
					showWarning={true}
				/>
			</Card.Footer>
		</Card.Root>

		<!-- Storage -->
		<Card.Root class="flex flex-col">
			<Card.Header class="pb-3">
				<Card.Title class="flex items-start gap-2 text-base">
					<Database class="h-4 w-4 flex-shrink-0 mt-1" />
					Storage
				</Card.Title>
			</Card.Header>
			<Card.Content class="flex-grow"></Card.Content>
			<Card.Footer class="pt-0 block">
				<UsageBadge
					label="Storage"
					current={Math.round(data.usage.usedStorageMb)}
					max={data.usage.maxStorageMb}
					unit="MB"
					variant="full"
					showWarning={true}
				/>
			</Card.Footer>
		</Card.Root>
	</div>

	<!-- Overage Mode (Pro/Business only) -->
	{#if data.subscription.tier !== 'free'}
		<Card.Root variant="muted" class="mb-8">
			<Card.Content>
				<div class="flex items-center justify-between">
				<div>
					<Card.Title class="flex items-center gap-2">
						<Settings class="h-5 w-5" />Overage Handling 
						<span class="text-muted-foreground text-sm">{#if data.usage.overageMode === 'auto_bill'}
							(Auto-bill overages)
						{:else}
							(Pause forms)
						{/if}
						</span>
					</Card.Title>
					<Card.Description>
						How to handle submissions when you exceed your monthly limit.
						
					</Card.Description>
				</div>
				<Button variant="outline" size="sm" href="/settings/billing">
					Change Setting
				</Button>
			</div>
				
			</Card.Content>
	
	
			<!-- {#if data.usage.overageMode === 'auto_bill'}
				Forms will continue accepting submissions. You'll be charged $10 per 1,000 extra
				submissions.
			{:else} -->
	
		</Card.Root>
	{/if}

	<!-- Per-Space Details with Resource Allocation -->
	<div class="mb-8">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h2 class="text-2xl font-bold">Space Resource Allocation</h2>
				<p class="text-muted-foreground mt-1">
					{#if data.allocations.isAutoAllocated}
						Resources are automatically split evenly across all spaces
					{:else}
						Resources are manually allocated per space
					{/if}
				</p>
			</div>
			{#if data.subscription.tier !== 'free'}
				<Button href="/usage/allocate" variant="fancy" tracking size="sm">
					Manage Allocations
				</Button>
			{/if}
		</div>

		<!-- Sort controls -->
		{#if data.spaceUsages.length > 0}
			<div class="mb-4">
				<Select.Root bind:value={sortBy} type="single">
					<Select.Trigger class="w-[200px]">
						{selectedSortLabel}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="usage-desc" label="Highest Usage First">
							Highest Usage First
						</Select.Item>
						<Select.Item value="usage-asc" label="Lowest Usage First">
							Lowest Usage First
						</Select.Item>
						<Select.Item value="name-asc" label="Name (A-Z)">
							Name (A-Z)
						</Select.Item>
						<Select.Item value="name-desc" label="Name (Z-A)">
							Name (Z-A)
						</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		{/if}

		<div
			bind:this={scrollContainer}
			class="space-y-4 {showScrollContainer ? 'max-h-[720px] overflow-y-auto scroll-smooth scroll-shadows auto-hide-scrollbar' : ''} {isScrolling ? 'scrolling' : ''}"
		>
			{#each sortedSpaces as spaceUsage (spaceUsage.spaceId)}
				{@const spaceDetails = data.spaceDetails.find((s) => s.id === spaceUsage.spaceId)}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							{spaceUsage.spaceName}
							<a
								href="/spaces/{spaceUsage.spaceId}"
								class="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
								aria-label="View space {spaceUsage.spaceName}"
							>
								<ExternalLink class="h-4 w-4" />
							</a>
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<!-- Resource Usage -->
						<div class="mb-4 grid gap-4 md:grid-cols-2">
							<!-- Storage -->
							<div>
								<UsageBadge
									label="Storage ({spaceUsage.storagePercentage}% allocated)"
									current={spaceUsage.usedStorageMb}
									max={spaceUsage.allocatedStorageMb}
									unit="MB"
									variant="full"
									showWarning={true}
								/>
							</div>

							<!-- Submissions -->
							<div>
								<UsageBadge
									label="Submissions ({spaceUsage.submissionPercentage}% allocated)"
									current={spaceUsage.submissionsThisMonth}
									max={spaceUsage.allocatedSubmissionsPerMonth}
									variant="full"
									showWarning={true}
								/>
							</div>
						</div>

						<!-- Forms & Members -->
						<div class="grid gap-4 md:grid-cols-2">
							<div>
								<UsageBadge
									label="Forms"
									current={spaceDetails?.formCount || 0}
									max={data.subscription.maxFormsPerSpace}
									variant="full"
									showWarning={true}
								/>
							</div>
							<div>
								<UsageBadge
									label="Members"
									current={spaceDetails?.memberCount || 0}
									max={data.subscription.maxUsersPerSpace}
									variant="full"
									showWarning={true}
								/>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}

			{#if data.spaceUsages.length === 0}
				<div class="flex flex-col items-center gap-4 py-8">
					<p class="text-muted-foreground">No spaces yet</p>
					<Button href="/spaces/new" variant="outline">Create your first space</Button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Upgrade CTA (Free tier only) -->
	{#if data.subscription.tier === 'free'}
		<UpgradePrompt
			featureName="Upgrade to Pro"
			currentTier="free"
			requiredTier="pro"
			description="Get 25 spaces, 5,000 submissions/month, 10GB storage, webhooks, API access, and more!"
			variant="card"
			upgradeLink="/pricing"
		/>
	{/if}
</div>

<style>
	/* Auto-hide scrollbar using transparent background (macOS style) */
	.auto-hide-scrollbar {
		/* Firefox support - hidden by default */
		scrollbar-width: thin;
		scrollbar-color: transparent transparent;
		transition: scrollbar-color 0.8s ease;
	}

	/* Webkit scrollbar styling - hidden by default */
	.auto-hide-scrollbar::-webkit-scrollbar {
		width: 12px;
		background: transparent;
	}

	.auto-hide-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}

	.auto-hide-scrollbar::-webkit-scrollbar-thumb {
		background-color: transparent; /* Hidden by default */
		border-radius: 6px;
		border: 2px solid transparent;
		background-clip: padding-box;
		transition: background-color 0.8s ease;
	}

	/* Show scrollbar on hover (desktop only) */
	@media (hover: hover) {
		.auto-hide-scrollbar:hover {
			scrollbar-color: rgb(203 213 225 / 0.5) transparent;
		}

		.auto-hide-scrollbar:hover::-webkit-scrollbar-thumb {
			background-color: rgb(203 213 225 / 0.5); /* slate-300 with 50% opacity */
			transition: background-color 0.8s ease;
		}

		.auto-hide-scrollbar:hover::-webkit-scrollbar-thumb:hover {
			background-color: rgb(148 163 184 / 0.7); /* slate-400 with 70% opacity - darker on thumb hover */
			transition: background-color 0.8s ease;
		}
	}

	/* Dark mode adjustments */
	:global(.dark) .auto-hide-scrollbar {
		scrollbar-color: transparent transparent;
	}

	@media (hover: hover) {
		:global(.dark) .auto-hide-scrollbar:hover {
			scrollbar-color: rgb(241 245 249 / 0.2) transparent;
		}

		:global(.dark) .auto-hide-scrollbar:hover::-webkit-scrollbar-thumb {
			background-color: rgb(241 245 249 / 0.2); /* slate-100 with 20% opacity */
			transition: background-color 0.8s ease;
		}

		:global(.dark) .auto-hide-scrollbar:hover::-webkit-scrollbar-thumb:hover {
			background-color: rgb(241 245 249 / 0.3); /* slate-100 with 30% opacity */
			transition: background-color 0.8s ease;
		}
	}

	/* Show scrollbar while scrolling */
	.auto-hide-scrollbar.scrolling {
		scrollbar-color: rgb(203 213 225 / 0.5) transparent;
	}

	.auto-hide-scrollbar.scrolling::-webkit-scrollbar-thumb {
		background-color: rgb(203 213 225 / 0.5);
		transition: background-color 0.8s ease;
	}

	:global(.dark) .auto-hide-scrollbar.scrolling {
		scrollbar-color: rgb(241 245 249 / 0.2) transparent;
		transition: scrollbar-color 0.8s ease;
	}

	:global(.dark) .auto-hide-scrollbar.scrolling::-webkit-scrollbar-thumb {
		background-color: rgb(241 245 249 / 0.2);
		transition: background-color 0.8s ease;
	}
</style>
