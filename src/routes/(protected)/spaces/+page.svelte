<script lang="ts">
	import type { PageData } from './$types';
	import PageIntro from '$lib/components/page-intro.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Users } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import SpacesDataTable from './spaces-data-table.svelte';
	import { columns, type Space } from './spaces-columns';

	let { data }: { data: PageData } = $props();

	// Show success toast if redirected after deletion
	$effect(() => {
		if ($page.url.searchParams.get('deleted') === 'true') {
			toast.success('Space deleted successfully');
			// Remove the query param from URL without reloading
			goto('/spaces', { replaceState: true });
		}
	});

	// Map the data to match the Space type
	const spaces: Space[] = $derived(
		data.spaces.map((space) => ({
			id: space.id,
			name: space.name,
			logo: space.logo,
			role: space.role,
			isPaused: space.isPaused,
			isClientOwned: space.isClientOwned,
			privacyIndicatorEnabled: space.privacyIndicatorEnabled,
			formCount: space.formCount,
			memberCount: space.memberCount,
			createdAt: space.createdAt
		}))
	);
</script>

<PageIntro
	title="My Spaces"
	description="Manage your workspaces and collaborate with your team"
>
	{#snippet cta()}
		<Button href="/spaces/new" tracking variant="fancy">
			<Plus class="size-4" />
			Create Space
		</Button>
	{/snippet}
</PageIntro>

{#if data.spaces.length === 0}
	<Card class="border-dashed">
		<CardContent class="flex flex-col items-center justify-center py-16">
			<Users class="text-muted-foreground mb-4 h-12 w-12" />
			<h3 class="mb-2 text-lg font-semibold">No spaces yet</h3>
			<p class="text-muted-foreground mb-4 text-center">
				Create your first space to start organizing forms and submissions
			</p>
			<Button href="/spaces/new">
				<Plus class="mr-2 h-4 w-4" />
				Create Your First Space
			</Button>
		</CardContent>
	</Card>
{:else}
	<SpacesDataTable data={spaces} {columns} />
{/if}
