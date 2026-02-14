<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { DataTableColumnVisibility } from '$lib/components/data-table';
	import type { Column } from '$lib/components/data-table';
	import { getImageUrl } from '$lib/types/images';
	import {
		ChevronLeft,
		ChevronRight,
		UserCog,
		ArrowRight,
		Clock,
		CheckCircle,
		AlertCircle,
		XCircle,
		Trash2,
		ArrowUpDown,
		ArrowUp,
		ArrowDown
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data }: { data: PageData } = $props();

	const columns: Column[] = [
		{ id: 'superadmin', label: 'Superadmin', hideable: false },
		{ id: 'target', label: 'Target User', hideable: false },
		{ id: 'started', label: 'Started', sortable: true },
		{ id: 'duration', label: 'Duration', sortable: true },
		{ id: 'status', label: 'Status', sortable: true },
		{ id: 'details', label: 'IP / Browser' }
	];

	const STORAGE_KEY = 'superadmin-audit-columns';

	let selectedIds = $state<Set<string>>(new Set());
	let activeSessions = $derived(data.logs.filter((log) => !log.endedAtMs));
	let visibleColumns = $state<string[]>(data.visibleColumns);

	// Sync visible columns with localStorage on mount
	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					visibleColumns = JSON.parse(saved);
				} catch {
					visibleColumns = data.defaultColumns;
				}
			}
		}
	});

	function formatDate(ms: number): string {
		return new Date(ms).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	let allSelected = $derived(data.logs.length > 0 && selectedIds.size === data.logs.length);
	let someSelected = $derived(selectedIds.size > 0 && selectedIds.size < data.logs.length);

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(data.logs.map((log) => log.id));
		}
	}

	function toggleSelect(id: string) {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedIds = newSet;
	}

	const handleDelete: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				selectedIds = new Set();
			}
			await update();
		};
	};

	function toggleSort(column: string) {
		const params = new URLSearchParams($page.url.searchParams);
		const currentSortBy = data.sortBy;
		const currentSortOrder = data.sortOrder;

		if (currentSortBy === column) {
			params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			params.set('sortBy', column);
			params.set('sortOrder', 'asc');
		}
		params.delete('page');
		goto(`?${params.toString()}`);
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}

	function setLimit(value: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('limit', value);
		params.delete('page');
		goto(`?${params.toString()}`);
	}

	function formatDuration(durationSecs: number) {
		const mins = Math.floor(durationSecs / 60);
		const hours = Math.floor(durationSecs / 3600);
		const secs = durationSecs % 60;

		if (durationSecs < 60) return `${durationSecs}s`;
		if (mins < 60) return `${mins}m ${secs}s`;
		return `${hours}h ${mins % 60}m`;
	}

	function truncateUserAgent(ua: string | null) {
		if (!ua) return 'Unknown';
		const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
		return match ? match[0] : ua.slice(0, 30) + '...';
	}

	function toggleColumnVisibility(columnId: string) {
		if (visibleColumns.includes(columnId)) {
			if (visibleColumns.length > 1) {
				visibleColumns = visibleColumns.filter((c) => c !== columnId);
			}
		} else {
			visibleColumns = [...visibleColumns, columnId];
		}

		if (browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
		}

		const params = new URLSearchParams($page.url.searchParams);
		params.set('columns', visibleColumns.join(','));
		params.delete('page');
		goto(`?${params.toString()}`);
	}

	function resetColumns() {
		visibleColumns = [...data.defaultColumns];

		if (browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
		}

		const params = new URLSearchParams($page.url.searchParams);
		params.delete('columns');
		params.delete('page');
		goto(`?${params.toString()}`);
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Audit Log</h1>
			<p class="text-muted-foreground">
				Impersonation session history ({data.pagination.total} total)
			</p>
		</div>
		<div class="flex items-center gap-2">
			{#if selectedIds.size > 0}
				<form method="POST" action="?/deleteSelected" use:enhance={handleDelete}>
					<input type="hidden" name="logIds" value={JSON.stringify([...selectedIds])} />
					<Button type="submit" variant="destructive" size="sm">
						<Trash2 class="h-4 w-4 mr-2" />
						Delete Selected ({selectedIds.size})
					</Button>
				</form>
			{/if}
			{#if activeSessions.length > 0}
				<form method="POST" action="?/forceEndAll" use:enhance>
					<Button type="submit" variant="outline" size="sm">
						<XCircle class="h-4 w-4 mr-2" />
						End All Active ({activeSessions.length})
					</Button>
				</form>
			{/if}
			<DataTableColumnVisibility
				{columns}
				{visibleColumns}
				defaultColumns={data.defaultColumns}
				onToggle={toggleColumnVisibility}
				onReset={resetColumns}
			/>
		</div>
	</div>

	<!-- Logs Table -->
	<div class="overflow-x-auto rounded-md border bg-card [&_th:first-child]:pl-5 [&_th:last-child]:pr-3 [&_td:first-child]:pl-5 [&_td:last-child]:pr-3">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-12">
						<Checkbox
							checked={allSelected}
							indeterminate={someSelected}
							onCheckedChange={toggleSelectAll}
							aria-label="Select all"
						/>
					</Table.Head>
					{#if visibleColumns.includes('superadmin')}
						<Table.Head>Superadmin</Table.Head>
					{/if}
					{#if visibleColumns.includes('superadmin') && visibleColumns.includes('target')}
						<Table.Head></Table.Head>
					{/if}
					{#if visibleColumns.includes('target')}
						<Table.Head>Target User</Table.Head>
					{/if}
					{#if visibleColumns.includes('started')}
						<Table.Head>
							<Button
								variant="ghost"
								onclick={() => toggleSort('started')}
								class="-ml-4 h-8 flex items-center gap-1"
							>
								Started
								{#if data.sortBy === 'started'}
									{#if data.sortOrder === 'asc'}
										<ArrowUp class="h-4 w-4" />
									{:else}
										<ArrowDown class="h-4 w-4" />
									{/if}
								{:else}
									<ArrowUpDown class="h-4 w-4 opacity-50" />
								{/if}
							</Button>
						</Table.Head>
					{/if}
					{#if visibleColumns.includes('duration')}
						<Table.Head>
							<Button
								variant="ghost"
								onclick={() => toggleSort('duration')}
								class="-ml-4 h-8 flex items-center gap-1"
							>
								Duration
								{#if data.sortBy === 'duration'}
									{#if data.sortOrder === 'asc'}
										<ArrowUp class="h-4 w-4" />
									{:else}
										<ArrowDown class="h-4 w-4" />
									{/if}
								{:else}
									<ArrowUpDown class="h-4 w-4 opacity-50" />
								{/if}
							</Button>
						</Table.Head>
					{/if}
					{#if visibleColumns.includes('status')}
						<Table.Head>
							<Button
								variant="ghost"
								onclick={() => toggleSort('status')}
								class="-ml-4 h-8 flex items-center gap-1"
							>
								Status
								{#if data.sortBy === 'status'}
									{#if data.sortOrder === 'asc'}
										<ArrowUp class="h-4 w-4" />
									{:else}
										<ArrowDown class="h-4 w-4" />
									{/if}
								{:else}
									<ArrowUpDown class="h-4 w-4 opacity-50" />
								{/if}
							</Button>
						</Table.Head>
					{/if}
					{#if visibleColumns.includes('details')}
						<Table.Head>IP / Browser</Table.Head>
					{/if}
					<Table.Head></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.logs as log}
					<Table.Row class="hover:bg-muted/50">
						<Table.Cell>
							<Checkbox
								checked={selectedIds.has(log.id)}
								onCheckedChange={() => toggleSelect(log.id)}
								aria-label="Select row"
							/>
						</Table.Cell>
						{#if visibleColumns.includes('superadmin')}
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Avatar.Root class="h-8 w-8">
										<Avatar.Image
											src={getImageUrl(log.superadmin.image, 'thumbnail')}
											alt={log.superadmin.name}
										/>
										<Avatar.Fallback>{log.superadmin.name?.charAt(0) || 'S'}</Avatar.Fallback>
									</Avatar.Root>
									<div>
										<p class="text-sm font-medium">{log.superadmin.name}</p>
										<p class="text-xs text-muted-foreground">{log.superadmin.email}</p>
									</div>
								</div>
							</Table.Cell>
						{/if}
						{#if visibleColumns.includes('superadmin') && visibleColumns.includes('target')}
							<Table.Cell>
								<ArrowRight class="h-4 w-4 text-muted-foreground" />
							</Table.Cell>
						{/if}
						{#if visibleColumns.includes('target')}
							<Table.Cell>
								<a
									href="/superadmin/users/{log.targetUserId}"
									class="flex items-center gap-2 hover:underline"
								>
									<Avatar.Root class="h-8 w-8">
										<Avatar.Image
											src={getImageUrl(log.targetUser.image, 'thumbnail')}
											alt={log.targetUser.name}
										/>
										<Avatar.Fallback>{log.targetUser.name?.charAt(0) || 'U'}</Avatar.Fallback>
									</Avatar.Root>
									<div>
										<p class="text-sm font-medium">{log.targetUser.name}</p>
										<p class="text-xs text-muted-foreground">{log.targetUser.email}</p>
									</div>
								</a>
							</Table.Cell>
						{/if}
						{#if visibleColumns.includes('started')}
							<Table.Cell class="text-sm text-muted-foreground">
								{formatDate(log.startedAtMs)}
							</Table.Cell>
						{/if}
						{#if visibleColumns.includes('duration')}
							<Table.Cell class="text-sm">
								<div class="flex items-center gap-1">
									<Clock class="h-3 w-3 text-muted-foreground" />
									{formatDuration(log.durationSecs)}
								</div>
							</Table.Cell>
						{/if}
						{#if visibleColumns.includes('status')}
							<Table.Cell>
								{#if log.endedAtMs}
									<span
										class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-500/10 text-green-500"
									>
										<CheckCircle class="h-3 w-3" />
										Ended
									</span>
								{:else}
									<span
										class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-yellow-500/10 text-yellow-500"
									>
										<AlertCircle class="h-3 w-3" />
										Active
									</span>
								{/if}
							</Table.Cell>
						{/if}
						{#if visibleColumns.includes('details')}
							<Table.Cell class="text-xs text-muted-foreground">
								<div>{log.ipAddress || 'Unknown IP'}</div>
								<div>{truncateUserAgent(log.userAgent)}</div>
							</Table.Cell>
						{/if}
						<Table.Cell>
							{#if !log.endedAtMs}
								<form method="POST" action="?/forceEnd" use:enhance>
									<input type="hidden" name="logId" value={log.id} />
									<Button type="submit" variant="ghost" size="sm" class="text-red-500 hover:text-red-600 hover:bg-red-500/10">
										<XCircle class="h-4 w-4" />
									</Button>
								</form>
							{/if}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={9} class="text-center py-8 text-muted-foreground">
							<UserCog class="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>No impersonation sessions recorded yet</p>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1 || data.pagination.total > 10}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<p class="text-sm text-muted-foreground">
					Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to {Math.min(
						data.pagination.page * data.pagination.limit,
						data.pagination.total
					)} of {data.pagination.total} sessions
				</p>
				<div class="flex items-center gap-2">
					<span class="text-sm text-muted-foreground">Show</span>
					<Select.Root
						type="single"
						value={data.pagination.limit.toString()}
						onValueChange={(v) => v && setLimit(v)}
					>
						<Select.Trigger class="w-[70px] h-8" size="sm">
							{data.pagination.limit}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="10">10</Select.Item>
							<Select.Item value="25">25</Select.Item>
							<Select.Item value="50">50</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={data.pagination.page <= 1}
					onclick={() => goToPage(data.pagination.page - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
					Previous
				</Button>
				<span class="text-sm text-muted-foreground px-2">
					Page {data.pagination.page} of {data.pagination.totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={data.pagination.page >= data.pagination.totalPages}
					onclick={() => goToPage(data.pagination.page + 1)}
				>
					Next
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
</div>
