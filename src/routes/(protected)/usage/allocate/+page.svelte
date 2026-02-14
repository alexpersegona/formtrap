<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { CircleAlert, RotateCcw, Save, Lock, LockOpen, Sparkles, HardDrive, Mail, HelpCircle } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const maxStorageMb = data.subscription.maxStorageMb;
	const maxSubmissions = data.subscription.maxSubmissionsPerMonth;

	// Initialize allocation state - store actual MB and submission counts
	// Use a single isLocked flag per space
	let allocations = $state(
		data.allocations.allocations.map((a) => ({
			spaceId: a.spaceId,
			spaceName: a.spaceName,
			storageMb: Math.round((a.storagePercentage / 100) * maxStorageMb),
			submissions: Math.round((a.submissionPercentage / 100) * maxSubmissions),
			isLocked: a.storageIsLocked || a.submissionIsLocked
		}))
	);

	// Computed percentages from actual values (with decimals for accuracy)
	const getStoragePercentage = (mb: number) => (mb / maxStorageMb) * 100;
	const getSubmissionPercentage = (count: number) => (count / maxSubmissions) * 100;

	// Total percentages
	const totalStoragePercentage = $derived(
		allocations.reduce((sum, a) => sum + getStoragePercentage(a.storageMb), 0)
	);
	const totalSubmissionPercentage = $derived(
		allocations.reduce((sum, a) => sum + getSubmissionPercentage(a.submissions), 0)
	);

	// Validation - check if totals are within acceptable range
	// Use 0.005 threshold so that 99.995-100.005 shows as "perfect" when displayed with 2 decimals
	const storageStatus = $derived.by(() => {
		if (Math.abs(totalStoragePercentage - 100) < 0.005) return 'perfect';
		if (totalStoragePercentage > 100) return 'over';
		return 'under';
	});
	const submissionStatus = $derived.by(() => {
		if (Math.abs(totalSubmissionPercentage - 100) < 0.005) return 'perfect';
		if (totalSubmissionPercentage > 100) return 'over';
		return 'under';
	});

	const allValid = $derived(storageStatus !== 'over' && submissionStatus !== 'over');

	// Count locked items
	const lockedCount = $derived(allocations.filter((a) => a.isLocked).length);
	const unlockedCount = $derived(allocations.length - lockedCount);

	// Help dialog state
	let helpDialogOpen = $state(false);

	// Show sticky controls when there are many spaces
	const showStickyControls = $derived(allocations.length >= 8);

	// Auto-hide scrollbar on scroll (macOS style)
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
		if (scrollContainer && showStickyControls) {
			scrollContainer.addEventListener('scroll', handleScroll);
			return () => {
				scrollContainer.removeEventListener('scroll', handleScroll);
				clearTimeout(scrollTimeout);
			};
		}
	});

	// Toggle lock for allocation (locks both storage and submissions)
	function toggleLock(spaceId: string) {
		const allocation = allocations.find((a) => a.spaceId === spaceId);
		if (!allocation) return;
		allocation.isLocked = !allocation.isLocked;
	}

	// Balance remaining across unlocked spaces for BOTH storage and submissions
	function balanceRemaining() {
		const locked = allocations.filter((a) => a.isLocked);
		const unlocked = allocations.filter((a) => !a.isLocked);

		if (unlocked.length === 0) {
			toast.error('All spaces are locked. Unlock at least one space to distribute.');
			return;
		}

		// Calculate remaining for storage
		const lockedStorageMb = locked.reduce((sum, a) => sum + a.storageMb, 0);
		const remainingStorageMb = maxStorageMb - lockedStorageMb;

		// Calculate remaining for submissions
		const lockedSubmissions = locked.reduce((sum, a) => sum + a.submissions, 0);
		const remainingSubmissions = maxSubmissions - lockedSubmissions;

		if (remainingStorageMb < 0 || remainingSubmissions < 0) {
			toast.error('Locked allocations exceed 100%. Reduce locked allocations first.');
			return;
		}

		// Distribute storage equally with remainder handling
		const baseStorageMb = Math.floor(remainingStorageMb / unlocked.length);
		const storageRemainder = remainingStorageMb - baseStorageMb * unlocked.length;

		// Distribute submissions equally with remainder handling
		const baseSubmissions = Math.floor(remainingSubmissions / unlocked.length);
		const submissionsRemainder = remainingSubmissions - baseSubmissions * unlocked.length;

		// Assign base amounts
		unlocked.forEach((a) => {
			a.storageMb = baseStorageMb;
			a.submissions = baseSubmissions;
		});

		// Distribute remainders
		for (let i = 0; i < storageRemainder; i++) {
			unlocked[i].storageMb += 1;
		}
		for (let i = 0; i < submissionsRemainder; i++) {
			unlocked[i].submissions += 1;
		}

		toast.success(`Balanced resources across ${unlocked.length} unlocked spaces`);
	}

	// Convert allocations to percentages for form submission
	const allocationsForSubmit = $derived(
		allocations.map((a) => ({
			spaceId: a.spaceId,
			storagePercentage: Number(getStoragePercentage(a.storageMb).toFixed(2)),
			submissionPercentage: Number(getSubmissionPercentage(a.submissions).toFixed(2)),
			storageIsLocked: a.isLocked,
			submissionIsLocked: a.isLocked
		}))
	);

	// Form submission
	let saving = $state(false);
	let updateForm: HTMLFormElement;

	const handleSave: SubmitFunction = () => {
		saving = true;
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				toast.success('Allocations updated successfully');
			} else if (result.type === 'success') {
				toast.success('Allocations updated successfully');
			} else if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to update allocations');
			}
			saving = false;
			await update();
		};
	};

	async function saveAllocations() {
		if (!allValid) {
			toast.error('Total allocation cannot exceed 100%');
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 0));
		updateForm.requestSubmit();
	}

	// Reset form
	let resetForm: HTMLFormElement;
	let resetting = $state(false);

	const handleReset: SubmitFunction = () => {
		resetting = true;
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				toast.success('Reset to automatic allocation');
			} else if (result.type === 'success') {
				toast.success('Reset to automatic allocation');
			} else if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to reset allocations');
			}
			resetting = false;
			await update();
		};
	};

	async function resetToAuto() {
		await new Promise((resolve) => setTimeout(resolve, 0));
		resetForm.requestSubmit();
	}

	// Handle input changes with validation
	function handleStorageChange(spaceId: string, value: string) {
		const allocation = allocations.find((a) => a.spaceId === spaceId);
		if (!allocation) return;
		const numValue = parseInt(value) || 0;
		allocation.storageMb = Math.max(0, Math.min(numValue, maxStorageMb));
	}

	function handleSubmissionChange(spaceId: string, value: string) {
		const allocation = allocations.find((a) => a.spaceId === spaceId);
		if (!allocation) return;
		const numValue = parseInt(value) || 0;
		allocation.submissions = Math.max(0, Math.min(numValue, maxSubmissions));
	}

	// Get status color class
	function getStatusColor(status: 'perfect' | 'over' | 'under'): string {
		switch (status) {
			case 'perfect': return 'text-green-600 dark:text-green-400';
			case 'over': return 'text-red-600 dark:text-red-400';
			case 'under': return 'text-orange-600 dark:text-orange-400';
		}
	}

	function getStatusBgColor(status: 'perfect' | 'over' | 'under'): string {
		switch (status) {
			case 'perfect': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
			case 'over': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
			case 'under': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
		}
	}
</script>

<svelte:head>
	<title>Manage Resource Allocation - Form Capture Platform</title>
</svelte:head>

<!-- Hidden Forms -->
<form
	bind:this={updateForm}
	method="POST"
	action="?/updateAllocations"
	use:enhance={handleSave}
	class="hidden"
>
	<input
		type="hidden"
		name="allocations"
		value={JSON.stringify(allocationsForSubmit)}
	/>
</form>

<form
	bind:this={resetForm}
	method="POST"
	action="?/resetToAuto"
	use:enhance={handleReset}
	class="hidden"
></form>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">Manage Resource Allocation</h1>
		<p class="text-muted-foreground">
			Divide your {maxStorageMb.toLocaleString()} MB storage and {maxSubmissions.toLocaleString()} monthly submissions across your spaces
		</p>
	</div>

	<!-- Help Dialog -->
	<Dialog.Root bind:open={helpDialogOpen}>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Lock and Balance Allocations</Dialog.Title>
				<Dialog.Description>
					How to efficiently distribute resources across your spaces
				</Dialog.Description>
			</Dialog.Header>
			<div class="space-y-4 text-sm">
				<p>
					Lock important client allocations, then use "Balance Remaining" to automatically
					distribute the rest equally across unlocked spaces.
				</p>
				<div class="space-y-2">
					<p class="font-medium">Example workflow:</p>
					<ol class="list-decimal list-inside space-y-1 text-muted-foreground">
						<li>Set specific amounts for your most important spaces</li>
						<li>Lock those allocations to preserve them</li>
						<li>Click "Balance Remaining" to evenly split what's left</li>
					</ol>
				</div>
				<p class="text-muted-foreground">
					Currently: {lockedCount} locked, {unlockedCount} unlocked
				</p>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => helpDialogOpen = false}>Got it</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Space Allocations -->
	<Card.Root class="mb-6">
		<Card.Header>
			<!-- Top Row: What's this + Balance Remaining -->
			<div class="flex items-center justify-end gap-3">
				<button
					type="button"
					class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
					onclick={() => helpDialogOpen = true}
				>
					<HelpCircle class="h-3 w-3" />
					What's this?
				</button>
				<Button variant="outline" size="sm" onclick={balanceRemaining}>
					<Sparkles class="mr-2 h-4 w-4" />
					Balance Remaining
				</Button>
			</div>
		</Card.Header>
		<Card.Content>
			<!-- Totals Row (just above spaces) -->
			<div class="flex flex-col sm:flex-row gap-3 sm:gap-6 mb-4">
				<!-- Storage Total -->
				<div class="flex items-center gap-2">
					<HardDrive class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm font-medium">Storage:</span>
					{#if storageStatus === 'over'}
						<CircleAlert class="h-4 w-4 text-red-600 dark:text-red-400" />
					{/if}
					<span class={`font-semibold ${getStatusColor(storageStatus)}`}>
						{totalStoragePercentage.toFixed(2)}%
					</span>
					<Badge class={getStatusBgColor(storageStatus)}>
						{#if storageStatus === 'perfect'}
							Balanced
						{:else if storageStatus === 'over'}
							Over
						{:else}
							{(100 - totalStoragePercentage).toFixed(2)}% unused
						{/if}
					</Badge>
				</div>

				<!-- Submissions Total -->
				<div class="flex items-center gap-2">
					<Mail class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm font-medium">Submissions:</span>
					{#if submissionStatus === 'over'}
						<CircleAlert class="h-4 w-4 text-red-600 dark:text-red-400" />
					{/if}
					<span class={`font-semibold ${getStatusColor(submissionStatus)}`}>
						{totalSubmissionPercentage.toFixed(2)}%
					</span>
					<Badge class={getStatusBgColor(submissionStatus)}>
						{#if submissionStatus === 'perfect'}
							Balanced
						{:else if submissionStatus === 'over'}
							Over
						{:else}
							{(100 - totalSubmissionPercentage).toFixed(2)}% unused
						{/if}
					</Badge>
				</div>
			</div>
			<!-- Scrollable container with shadows -->
			<div
				bind:this={scrollContainer}
				class="space-y-4 {showStickyControls ? 'max-h-[600px] overflow-y-auto scroll-smooth scroll-shadows auto-hide-scrollbar' : ''} {isScrolling ? 'scrolling' : ''}"
				role="region"
				aria-label="Space allocations"
			>
				{#each allocations as allocation (allocation.spaceId)}
					{@const storagePercent = getStoragePercentage(allocation.storageMb)}
					{@const submissionPercent = getSubmissionPercentage(allocation.submissions)}
					<div class="rounded-lg border p-4 {allocation.isLocked ? 'bg-muted/30' : ''}">
						<!-- Space Header with Lock -->
						<div class="mb-4 flex items-center justify-between">
							<h3 class="font-semibold truncate flex-1 min-w-0">{allocation.spaceName}</h3>
							<Button
								variant={allocation.isLocked ? 'ghost' : 'secondary'}
								size="sm"
								onclick={() => toggleLock(allocation.spaceId)}
								class="flex-shrink-0"
							>
								{#if allocation.isLocked}
									<Lock class="mr-2 h-4 w-4 text-primary" />
									Locked
								{:else}
									<LockOpen class="mr-2 h-4 w-4" />
									Lock
								{/if}
							</Button>
						</div>

						<!-- Storage and Submissions Inputs -->
						<div class="grid gap-4 sm:grid-cols-2">
							<!-- Storage Input -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<label class="text-sm font-medium flex items-center gap-1.5">
										<HardDrive class="h-4 w-4 text-muted-foreground" />
										Storage
									</label>
									<span class="text-xs text-muted-foreground">
										{storagePercent.toFixed(2)}%
									</span>
								</div>
								<div class="flex items-center gap-2">
									<Input
										type="number"
										min="0"
										max={maxStorageMb}
										value={allocation.storageMb}
										oninput={(e) => handleStorageChange(allocation.spaceId, e.currentTarget.value)}
										disabled={allocation.isLocked}
										class="flex-1"
									/>
									<span class="text-sm text-muted-foreground w-8">MB</span>
								</div>
							</div>

							<!-- Submissions Input -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<label class="text-sm font-medium flex items-center gap-1.5">
										<Mail class="h-4 w-4 text-muted-foreground" />
										Submissions
									</label>
									<span class="text-xs text-muted-foreground">
										{submissionPercent.toFixed(2)}%
									</span>
								</div>
								<div class="flex items-center gap-2">
									<Input
										type="number"
										min="0"
										max={maxSubmissions}
										value={allocation.submissions}
										oninput={(e) => handleSubmissionChange(allocation.spaceId, e.currentTarget.value)}
										disabled={allocation.isLocked}
										class="flex-1"
									/>
									<span class="text-sm text-muted-foreground w-12">/month</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Actions -->
	<div class="mt-6 flex items-center justify-between">
		<Button variant="outline" onclick={resetToAuto} disabled={resetting || saving}>
			<RotateCcw class="mr-2 h-4 w-4" />
			Reset to Auto-Split
		</Button>

		<div class="flex gap-2">
			<Button variant="outline" href="/usage">Cancel</Button>
			<Button onclick={saveAllocations} disabled={!allValid || saving}>
				<Save class="mr-2 h-4 w-4" />
				{saving ? 'Saving...' : 'Save Allocations'}
			</Button>
		</div>
	</div>
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
