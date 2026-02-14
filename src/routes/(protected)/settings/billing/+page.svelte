<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import PageIntro from '$lib/components/page-intro.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Crown, TrendingUp, Calendar, Settings, CreditCard, ArrowLeft } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedOverageMode = $state<'pause' | 'auto_bill'>(data.subscription.overageMode);
	let updating = $state(false);

	const handleOverageModeSubmit: SubmitFunction = () => {
		updating = true;
		return async ({ result }) => {
			updating = false;
			if (result.type === 'success') {
				toast.success('Overage mode updated successfully');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to update overage mode');
				// Reset to current value on failure
				selectedOverageMode = data.subscription.overageMode;
			}
		};
	};

	const tierColors = {
		free: 'bg-gray-100 text-gray-800 border-gray-300',
		pro: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-purple-300',
		business: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 border-indigo-300'
	};

	const tierNames = {
		free: 'Free',
		pro: 'Pro',
		business: 'Business'
	};

	function formatDate(date: Date | null | undefined): string {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Billing Settings - Form Capture Platform</title>
</svelte:head>

<div class="max-w-3xl mx-auto space-y-6">
	<PageIntro
		title="Settings"
		description="Manage your account settings and preferences"
	/>

	<Tabs.Root value="billing" onValueChange={(value) => {
		if (value === 'account') {
			goto('/settings');
		}
	}} class="w-full">
		<Tabs.List variant="important" class="mb-6">
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
			<Tabs.Trigger value="billing">Billing</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="billing" class="space-y-6">
	<!-- Current Plan -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Current Plan</Card.Title>
			<Card.Description>Your active subscription tier</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Badge
						variant="outline"
						class="flex items-center gap-2 px-4 py-2 text-lg font-semibold {tierColors[
							data.subscription.tier
						]}"
					>
						{#if data.subscription.tier === 'free'}
							<TrendingUp class="h-5 w-5" />
						{:else}
							<Crown class="h-5 w-5" />
						{/if}
						{tierNames[data.subscription.tier]} Plan
					</Badge>
					<Badge variant={data.subscription.status === 'active' ? 'default' : 'destructive'}>
						{data.subscription.status}
					</Badge>
				</div>
				<Button href="/pricing" variant="default">
					{data.subscription.tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
				</Button>
			</div>

			{#if data.subscription.currentPeriodStart && data.subscription.currentPeriodEnd}
				<div class="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
					<Calendar class="h-4 w-4" />
					<span>
						Current period: {formatDate(data.subscription.currentPeriodStart)} - {formatDate(
							data.subscription.currentPeriodEnd
						)}
					</span>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Overage Settings (Pro/Business only) -->
	{#if data.subscription.tier !== 'free'}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Settings class="h-5 w-5" />
					Overage Handling
				</Card.Title>
				<Card.Description>
					How to handle submissions when you exceed your monthly limit
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/updateOverageMode" use:enhance={handleOverageModeSubmit}>
					<div class="space-y-6">
						<!-- Radio Buttons for Overage Mode -->
						<div class="space-y-3">
							<label class="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors {selectedOverageMode === 'pause' ? 'border-primary bg-muted/30' : ''}">
								<input
									type="radio"
									name="overageMode"
									value="pause"
									bind:group={selectedOverageMode}
									disabled={updating}
									class="mt-1"
								/>
								<div class="flex-1">
									<p class="font-medium">Pause Forms</p>
									<p class="text-muted-foreground text-sm mt-1">
										Forms automatically stop accepting submissions when you hit your limit. Users can still view forms but submissions will be rejected with a friendly message.
									</p>
								</div>
							</label>

							<label class="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors {selectedOverageMode === 'auto_bill' ? 'border-primary bg-muted/30' : ''}">
								<input
									type="radio"
									name="overageMode"
									value="auto_bill"
									bind:group={selectedOverageMode}
									disabled={updating}
									class="mt-1"
								/>
								<div class="flex-1">
									<p class="font-medium">Auto-Bill Overages</p>
									<p class="text-muted-foreground text-sm mt-1">
										Forms continue working seamlessly. You'll be charged for overages at the end of your billing cycle.
									</p>
								</div>
							</label>
						</div>

						<!-- Pricing Info -->
						<div class="rounded-lg bg-muted p-4">
							<p class="text-sm font-medium mb-2">Overage Pricing</p>
							<ul class="text-muted-foreground text-sm space-y-1">
								<li>• $10 per 1,000 submissions</li>
								<li>• $5 per 5GB storage</li>
							</ul>
						</div>

						<!-- Submit Button -->
						<div class="flex justify-end">
							<Button type="submit" disabled={updating || selectedOverageMode === data.subscription.overageMode}>
								{updating ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Payment & Billing Portal -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<CreditCard class="h-5 w-5" />
				Payment & Billing
			</Card.Title>
			<Card.Description>
				Manage payment methods, view invoices, and update billing information
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				{#if data.subscription.paymentProvider}
					<div class="rounded-lg border p-4">
						<p class="text-sm">
							<span class="text-muted-foreground">Payment Provider:</span>
							<span class="ml-2 font-medium capitalize">{data.subscription.paymentProvider}</span>
						</p>
						{#if data.subscription.billingCycle}
							<p class="text-muted-foreground mt-1 text-sm">
								Billing Cycle: {data.subscription.billingCycle === 'monthly'
									? 'Monthly'
									: 'Annual'}
							</p>
						{/if}
					</div>
				{/if}

				<div class="rounded-lg border border-dashed p-6 text-center">
					<p class="text-muted-foreground mb-3 text-sm">
						Access your billing portal to manage payment methods, view invoices, and update billing
						information
					</p>
					<Button variant="outline" disabled>
						Open Billing Portal
						<span class="ml-2 text-muted-foreground text-xs">(Coming Soon)</span>
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Quick Actions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Quick Actions</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-3">
				<Button variant="outline" href="/usage">View Usage & Limits</Button>
				<Button variant="outline" href="/pricing">Compare Plans</Button>
				{#if data.subscription.tier !== 'free'}
					<Button variant="outline" href="/usage/allocate">Manage Resource Allocations</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
