<script lang="ts" generics="TData">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { Search } from '@lucide/svelte';
	import DataTableColumnHeader from './data-table-column-header.svelte';
	import DataTablePagination from './data-table-pagination.svelte';
	import DataTableColumnVisibility from './data-table-column-visibility.svelte';
	import type { Column, Pagination } from './types';

	interface Props {
		data: TData[];
		columns: Column[];
		visibleColumns: string[];
		defaultColumns: string[];
		pagination: Pagination;
		sortBy: string;
		sortOrder: 'asc' | 'desc';
		search?: string;
		searchPlaceholder?: string;
		emptyMessage?: string;
		emptyIcon?: Snippet;
		storageKey?: string;
		itemName?: string;
		row: Snippet<[TData, string[]]>;
		headerActions?: Snippet;
		title: string;
		subtitle?: string;
	}

	let {
		data,
		columns,
		visibleColumns: initialVisibleColumns,
		defaultColumns,
		pagination,
		sortBy,
		sortOrder,
		search = '',
		searchPlaceholder = 'Search...',
		emptyMessage = 'No items found',
		emptyIcon,
		storageKey,
		itemName = 'items',
		row,
		headerActions,
		title,
		subtitle
	}: Props = $props();

	let searchInput = $state(search);
	let searchTimeout: ReturnType<typeof setTimeout>;
	let visibleColumns = $state<string[]>(initialVisibleColumns);

	// Sync visible columns with localStorage on mount
	$effect(() => {
		if (browser && storageKey) {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				try {
					visibleColumns = JSON.parse(saved);
				} catch {
					visibleColumns = defaultColumns;
				}
			}
		}
	});

	// Get visible column objects
	let visibleColumnObjects = $derived(columns.filter((c) => visibleColumns.includes(c.id)));

	// Calculate colspan for empty state
	let colSpan = $derived(visibleColumnObjects.length + 1); // +1 for actions column

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const params = new URLSearchParams($page.url.searchParams);
			if (searchInput) {
				params.set('search', searchInput);
			} else {
				params.delete('search');
			}
			params.delete('page');
			goto(`?${params.toString()}`);
		}, 300);
	}

	function toggleSort(columnId: string) {
		const params = new URLSearchParams($page.url.searchParams);

		if (sortBy === columnId) {
			params.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			params.set('sortBy', columnId);
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

	function toggleColumnVisibility(columnId: string) {
		if (visibleColumns.includes(columnId)) {
			// Don't allow hiding all columns
			if (visibleColumns.length > 1) {
				visibleColumns = visibleColumns.filter((c) => c !== columnId);
			}
		} else {
			visibleColumns = [...visibleColumns, columnId];
		}

		// Persist to localStorage
		if (browser && storageKey) {
			localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
		}

		// Update URL for server-side query optimization
		const params = new URLSearchParams($page.url.searchParams);
		params.set('columns', visibleColumns.join(','));

		// If sorting by hidden column, reset to default
		if (!visibleColumns.includes(sortBy)) {
			params.set('sortBy', defaultColumns[0] || 'created');
			params.set('sortOrder', 'desc');
		}

		params.delete('page');
		goto(`?${params.toString()}`);
	}

	function resetColumns() {
		visibleColumns = [...defaultColumns];

		if (browser && storageKey) {
			localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
		}

		const params = new URLSearchParams($page.url.searchParams);
		params.delete('columns');
		params.delete('page');
		goto(`?${params.toString()}`);
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
			{#if subtitle}
				<p class="text-muted-foreground">{subtitle}</p>
			{:else}
				<p class="text-muted-foreground">{pagination.total} total {itemName}</p>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if headerActions}
				{@render headerActions()}
			{/if}
			<DataTableColumnVisibility
				{columns}
				{visibleColumns}
				{defaultColumns}
				onToggle={toggleColumnVisibility}
				onReset={resetColumns}
			/>
			<!-- Search -->
			<div class="relative w-full sm:w-80">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder={searchPlaceholder}
					class="pl-10"
					bind:value={searchInput}
					oninput={handleSearch}
				/>
			</div>
		</div>
	</div>

	<!-- Table -->
	<div
		class="overflow-x-auto rounded-md border bg-card [&_th:first-child]:pl-5 [&_th:last-child]:pr-3 [&_td:first-child]:pl-5 [&_td:last-child]:pr-3"
	>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					{#each visibleColumnObjects as column}
						<Table.Head class={column.align === 'center' ? 'text-center' : ''}>
							<DataTableColumnHeader {column} {sortBy} {sortOrder} onSort={toggleSort} />
						</Table.Head>
					{/each}
					<Table.Head></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data as item}
					<Table.Row class="hover:bg-muted/50">
						{@render row(item, visibleColumns)}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={colSpan} class="text-center py-8 text-muted-foreground">
							{#if emptyIcon}
								{@render emptyIcon()}
							{/if}
							{#if search}
								No {itemName} found matching "{search}"
							{:else}
								{emptyMessage}
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination -->
	<DataTablePagination {pagination} {itemName} onPageChange={goToPage} onLimitChange={setLimit} />
</div>
