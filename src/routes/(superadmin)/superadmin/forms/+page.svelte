<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { DataTable } from '$lib/components/data-table';
	import type { Column } from '$lib/components/data-table';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import {
		FileText,
		Inbox,
		AlertTriangle,
		CheckCircle,
		XCircle,
		ExternalLink
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns: Column[] = [
		{ id: 'form', label: 'Form', sortable: true, hideable: false },
		{ id: 'space', label: 'Space', sortable: true },
		{ id: 'creator', label: 'Creator', sortable: true },
		{ id: 'submissions', label: 'Submissions', sortable: true, align: 'center' },
		{ id: 'spam', label: 'Spam', sortable: true, align: 'center' },
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
			<FileText class="h-4 w-4" />
			All ({data.counts.total})
		</button>
		<button
			onclick={() => setFilter('active')}
			class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
				{data.filter === 'active'
				? 'bg-primary text-primary-foreground'
				: 'text-muted-foreground hover:bg-accent'}"
		>
			<CheckCircle class="h-4 w-4" />
			Active ({data.counts.active})
		</button>
		<button
			onclick={() => setFilter('inactive')}
			class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
				{data.filter === 'inactive'
				? 'bg-primary text-primary-foreground'
				: 'text-muted-foreground hover:bg-accent'}"
		>
			<XCircle class="h-4 w-4" />
			Inactive ({data.counts.inactive})
		</button>
	</div>

	<DataTable
		data={data.forms}
		{columns}
		visibleColumns={data.visibleColumns}
		defaultColumns={data.defaultColumns}
		pagination={data.pagination}
		sortBy={data.sortBy}
		sortOrder={data.sortOrder}
		search={data.search}
		searchPlaceholder="Search forms..."
		emptyMessage="No forms yet"
		storageKey="superadmin-forms-columns"
		itemName="forms"
		title="Forms"
	>
		{#snippet row(formItem, visibleColumns)}
			{#if visibleColumns.includes('form')}
				<Table.Cell>
					<div class="flex items-center gap-3">
						<div class="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
							<FileText class="h-4 w-4 text-muted-foreground" />
						</div>
						<div>
							<p class="font-medium">{formItem.name}</p>
							{#if formItem.description}
								<p class="text-xs text-muted-foreground truncate max-w-[200px]">
									{formItem.description}
								</p>
							{/if}
						</div>
					</div>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('space')}
				<Table.Cell>
					<span class="text-sm">{formItem.spaceName || 'Unknown'}</span>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('creator')}
				<Table.Cell>
					<div>
						<p class="text-sm">{formItem.creatorName || 'Unknown'}</p>
						<p class="text-xs text-muted-foreground">{formItem.creatorEmail || ''}</p>
					</div>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('submissions')}
				<Table.Cell class="text-center">
					<div class="flex items-center justify-center gap-1">
						<Inbox class="h-4 w-4 text-muted-foreground" />
						<span>{formItem.submissionCount}</span>
					</div>
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('spam')}
				<Table.Cell class="text-center">
					{#if formItem.spamCount > 0}
						<div class="flex items-center justify-center gap-1 text-orange-500">
							<AlertTriangle class="h-4 w-4" />
							<span>{formItem.spamCount}</span>
						</div>
					{:else}
						<span class="text-muted-foreground">0</span>
					{/if}
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('status')}
				<Table.Cell>
					{#if formItem.isActive}
						<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-500/10 text-green-500">
							<CheckCircle class="h-3 w-3" />
							Active
						</span>
					{:else}
						<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-muted text-muted-foreground">
							<XCircle class="h-3 w-3" />
							Inactive
						</span>
					{/if}
				</Table.Cell>
			{/if}

			{#if visibleColumns.includes('created')}
				<Table.Cell class="text-muted-foreground">
					{formatDate(formItem.createdAt)}
				</Table.Cell>
			{/if}

			<Table.Cell>
				<a href="/spaces/{formItem.organizationId}/forms/{formItem.id}">
					<Button variant="ghost" size="sm">
						<ExternalLink class="h-4 w-4" />
					</Button>
				</a>
			</Table.Cell>
		{/snippet}
	</DataTable>
</div>
