<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import PageIntro from '$lib/components/page-intro.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';
	import { Database, FileText } from 'lucide-svelte';
	import UsageBadge from '$lib/components/UsageBadge.svelte';

	let { data }: { data: PageData } = $props();

	// Show welcome toast for new registrations
	onMount(() => {
		if ($page.url.searchParams.get('registered') === 'true') {
			toast.success('Welcome!', {
				description: 'Thanks for signing up! Your account has been created successfully.',
				duration: 4000
			});
			// Clean up URL parameter
			window.history.replaceState({}, '', '/dashboard');
		}
	});
</script>

<PageIntro title="Dashboard" description="Welcome back, {data.user.name}!" />

<div class="space-y-6">
	<!-- Usage Metrics -->
	<div class="grid gap-6 md:grid-cols-3">
		<!-- Spaces -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2 text-base">
					<Database class="h-4 w-4" />
					Spaces
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<UsageBadge
					label="Spaces"
					current={data.usage.currentSpaces}
					max={data.usage.maxSpaces}
					variant="full"
					showWarning={true}
				/>
			</Card.Content>
		</Card.Root>

		<!-- Submissions -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2 text-base">
					<FileText class="h-4 w-4" />
					Submissions This Month
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<UsageBadge
					label="Submissions"
					current={data.usage.submissionsThisMonth}
					max={data.usage.maxSubmissionsPerMonth}
					variant="full"
					showWarning={true}
				/>
			</Card.Content>
		</Card.Root>

		<!-- Storage -->
		<Card.Root>
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2 text-base">
					<Database class="h-4 w-4" />
					Storage
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<UsageBadge
					label="Storage"
					current={Math.round(data.usage.usedStorageMb)}
					max={data.usage.maxStorageMb}
					unit="MB"
					variant="full"
					showWarning={true}
				/>
			</Card.Content>
		</Card.Root>
	</div>
</div>
