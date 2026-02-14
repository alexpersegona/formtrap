<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { DataTable } from '$lib/components/data-table';
	import type { Column } from '$lib/components/data-table';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import {
		Building2,
		Users,
		FileText,
		Inbox,
		PauseCircle,
		PlayCircle,
		ExternalLink
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns: Column[] = [
		{ id: 'space', label: 'Space', sortable: true, hideable: false },
		{ id: 'owner', label: 'Owner', sortable: true },
		{ id: 'members', label: 'Members', sortable: true, align: 'center' },
		{ id: 'forms', label: 'Forms', sortable: true, align: 'center' },
		{ id: 'submissions', label: 'Submissions', sortable: true, align: 'center' },
		{ id: 'status', label: 'Status', sortable: true },
		{ id: 'created', label: 'Created', sortable: true }
	];

	function setFilter(filter: string) {
		const params = new URLSearchParams($page.url.searchParams);
		if (filter === 'all') {
			params.delete('filter');
		} else {
			params.set('filter', filter);
		}
		params.delete('page');
		goto(`?${params.toString()}`);
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="space-y-6">
	<!-- Filter Tabs -->
	<div class="flex items-center gap-2 border-b pb-2">
		<button
			onclick={() => setFilter('all')}
			class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
				{data.filter === 'all'
				? 'bg-primary text-primary-foreground'
				: 'text-muted-foreground hover:bg-accent'}"
		>
			<Building2 class="h-4 w-4" />
			All ({data.counts.total})
		</button>
		<button
			onclick={() => setFilter('active')}
			class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
				{data.filter === 'active'
				? 'bg-primary text-primary-foreground'
				: 'text-muted-foreground hover:bg-accent'}"
		>
			<PlayCircle class="h-4 w-4" />
			Active ({data.counts.active})
		</button>
		<button
			onclick={() => setFilter('paused')}
			class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
				{data.filter === 'paused'
				? 'bg-primary text-primary-foreground'
				: 'text-muted-foreground hover:bg-accent'}"
		>
			<PauseCircle class="h-4 w-4" />
			Paused ({data.counts.paused})
		</button>
		<button
			onclick={() => setFilter('client')}
			class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
				{data.filter === 'client'
				? 'bg-primary text-primary-foreground'
				: 'text-muted-foreground hover:bg-accent'}"
		>
			<Users class="h-4 w-4" />
			Client-owned ({data.counts.client})
		</button>
	</div>

	<DataTable
		data={data.spaces}
		{columns}
		visibleColumns={data.visibleColumns}
		defaultColumns={data.defaultColumns}
		pagination={data.pagination}
		sortBy={data.sortBy}
		sortOrder={data.sortOrder}
		search={data.search}
		searchPlaceholder="Search spaces..."
		emptyMessage="No spaces yet"
		storageKey="superadmin-spaces-columns"
		itemName="spaces"
		title="Spaces"
	>
		{#snippet row(space, visibleColumns)}
			{#if visibleColumns.includes('space')}
				<Table.Cell>
					<div class="flex items-center gap-3">
						<div class="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
							<Building2 class="h-4 w-4 text-muted-foreground" />
						</div>
						<div>
							<p class="font-medium">{space.name}</p>
							{#if space.isClientOwned}
								<span class="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded">Client</span>
							{/if}
						</div>
					</div>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('owner')}
				<Table.Cell>
					<div>
						<p class="text-sm">{space.ownerName || 'Unknown'}</p>
						<p class="text-xs text-muted-foreground">{space.ownerEmail || ''}</p>
					</div>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('members')}
				<Table.Cell class="text-center">
					<div class="flex items-center justify-center gap-1">
						<Users class="h-4 w-4 text-muted-foreground" />
						<span>{space.memberCount}</span>
					</div>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('forms')}
				<Table.Cell class="text-center">
					<div class="flex items-center justify-center gap-1">
						<FileText class="h-4 w-4 text-muted-foreground" />
						<span>{space.formCount}</span>
					</div>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('submissions')}
				<Table.Cell class="text-center">
					<div class="flex items-center justify-center gap-1">
						<Inbox class="h-4 w-4 text-muted-foreground" />
						<span>{space.submissionCount}</span>
					</div>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('status')}
				<Table.Cell>
					{#if space.isPaused}
						<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-yellow-500/10 text-yellow-500">
							<PauseCircle class="h-3 w-3" />
							Paused
						</span>
					{:else}
						<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-500/10 text-green-500">
							<PlayCircle class="h-3 w-3" />
							Active
						</span>
					{/if}
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('created')}
				<Table.Cell class="text-muted-foreground">
					{formatDate(space.createdAt)}
				</Table.Cell>
			{/if}

			<Table.Cell>
				<a href="/spaces/{space.id}">
					<Button variant="ghost" size="sm">
						<ExternalLink class="h-4 w-4" />
					</Button>
				</a>
			</Table.Cell>
		{/snippet}
	</DataTable>
</div>
