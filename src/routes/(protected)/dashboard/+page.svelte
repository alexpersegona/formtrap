<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import PageIntro from '$lib/components/page-intro.svelte';
	import * as Card from '$lib/components/ui/card';
	import type { PageData } from './$types';
	import { FileText, LayoutGrid, Plug } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Show welcome toast for new registrations
	onMount(() => {
		if ($page.url.searchParams.get('registered') === 'true') {
			toast.success('Welcome!', {
				description: 'Thanks for signing up! Your account has been created successfully.',
				duration: 4000
			});
			window.history.replaceState({}, '', '/dashboard');
		}
	});
</script>

<PageIntro title="Dashboard" description="Welcome back, {data.user.name}!" />

<div class="space-y-6">
	{#if data.freeTrial}
		<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
			<p class="text-sm text-yellow-800 dark:text-yellow-200">
				You're on the <strong>free trial</strong>. Connect your own infrastructure for unlimited forms and submissions.
			</p>
			<a href="/settings/connections" class="mt-2 inline-block text-sm font-medium text-yellow-900 underline dark:text-yellow-100">
				Set up connections →
			</a>
		</div>
	{/if}

	<div class="grid gap-6 md:grid-cols-3">
		<!-- Spaces -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2 text-base">
					<LayoutGrid class="h-4 w-4" />
					Spaces
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{data.spaceCount}</p>
				<p class="text-muted-foreground text-sm">
					of {data.maxSpaces} available
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Forms -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2 text-base">
					<FileText class="h-4 w-4" />
					Forms
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-2xl font-bold">{data.formCount}</p>
				<p class="text-muted-foreground text-sm">
					{#if data.freeTrial}
						1 max (free trial)
					{:else}
						Unlimited
					{/if}
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Connection Status -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2 text-base">
					<Plug class="h-4 w-4" />
					Infrastructure
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if data.connectionStatus}
					<div class="space-y-1">
						<p class="text-sm">
							<span class="inline-block h-2 w-2 rounded-full {data.connectionStatus.db === 'connected' ? 'bg-green-500' : 'bg-red-500'}"></span>
							Database: {data.connectionStatus.db === 'connected' ? 'Connected' : 'Not connected'}
						</p>
						<p class="text-sm">
							<span class="inline-block h-2 w-2 rounded-full {data.connectionStatus.storage === 'connected' ? 'bg-green-500' : 'bg-red-500'}"></span>
							Storage: {data.connectionStatus.storage === 'connected' ? 'Connected' : 'Not connected'}
						</p>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">Not configured</p>
					<a href="/settings/connections" class="text-sm font-medium underline">Set up →</a>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
