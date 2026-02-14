<script lang="ts">
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { getCoreRowModel, getFilteredRowModel, getSortedRowModel } from '@tanstack/table-core';
	import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/table-core';
	import type { Space } from './spaces-columns';
	import {
		Trash2,
		ChevronUp,
		ChevronDown,
		ChevronsUpDown,
		ChevronLeft,
		ChevronRight,
		MoreHorizontal,
		Settings,
		ExternalLink,
		ShieldAlert
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { tick } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import AnimatedShow from '$lib/components/AnimatedShow.svelte';
	import { PersistedState } from 'runed';
	import { getImageUrl } from '$lib/types/images';

	interface Props {
		data: Space[];
		columns: ColumnDef<Space>[];
	}

	let { data, columns }: Props = $props();

	let rowSelection = $state<Record<string, boolean>>({});
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let globalFilter = $state('');
	let isDeleting = $state(false);
	let deleteDialogOpen = $state(false);

	// Persisted preferences
	let perPageStore = browser ? new PersistedState('spaces-table-per-page', 10) : { current: 10 };

	// Pagination state
	let currentPage = $state(0);
	const initialPageSize = perPageStore.current;
	let pageSize = $state(initialPageSize);

	// Per-page options
	const perPageOptions = [
		{ value: '10', label: '10 per page' },
		{ value: '20', label: '20 per page' },
		{ value: '50', label: '50 per page' }
	];

	let perPageValue = $state(String(initialPageSize));

	// Watch for perPageValue changes
	$effect(() => {
		const newSize = parseInt(perPageValue);
		if (newSize !== pageSize) {
			pageSize = newSize;
			perPageStore.current = newSize;
			currentPage = 0; // Reset to first page
		}
	});

	const selectedPerPageLabel = $derived(
		perPageOptions.find((o) => o.value === perPageValue)?.label ?? '10 per page'
	);

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getRowId: (row) => row.id,
		state: {
			get rowSelection() {
				return rowSelection;
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			},
			get globalFilter() {
				return globalFilter;
			}
		},
		enableRowSelection: (row) => row.original.role === 'owner', // Only owners can be selected for deletion
		onRowSelectionChange: (updaterOrValue) => {
			rowSelection =
				typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;
		},
		onSortingChange: (updaterOrValue) => {
			sorting = typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue;
		},
		onColumnFiltersChange: (updaterOrValue) => {
			columnFilters =
				typeof updaterOrValue === 'function' ? updaterOrValue(columnFilters) : updaterOrValue;
		},
		onGlobalFilterChange: (updaterOrValue) => {
			globalFilter =
				typeof updaterOrValue === 'function' ? updaterOrValue(globalFilter) : updaterOrValue;
		}
	});

	// Pagination computed values - use getRowModel() which includes all processing (filter + sort)
	// We need to reference reactive state to ensure the derived recomputes
	const processedRows = $derived.by(() => {
		// Touch reactive state to ensure reactivity
		void sorting;
		void columnFilters;
		void globalFilter;
		return table.getRowModel().rows;
	});
	const totalPages = $derived(Math.ceil(processedRows.length / pageSize));
	const paginatedRows = $derived(processedRows.slice(currentPage * pageSize, (currentPage + 1) * pageSize));

	const selectedRows = $derived.by(() => {
		void rowSelection; // Touch for reactivity
		return table.getSelectedRowModel().rows.map((row) => row.original);
	});
	const selectedCount = $derived(selectedRows.length);
	const selectedIds = $derived(selectedRows.map((row) => row.id));

	// Sorting helpers
	function handleSort(columnId: string) {
		const currentSort = sorting.find((s) => s.id === columnId);
		if (!currentSort) {
			sorting = [{ id: columnId, desc: false }];
		} else if (!currentSort.desc) {
			sorting = [{ id: columnId, desc: true }];
		} else {
			sorting = [];
		}
		currentPage = 0; // Reset to first page when sorting
	}

	function getSortDirection(columnId: string): 'asc' | 'desc' | false {
		const sort = sorting.find((s) => s.id === columnId);
		if (!sort) return false;
		return sort.desc ? 'desc' : 'asc';
	}

	// Pagination helpers
	function goToPage(page: number) {
		if (page >= 0 && page < totalPages) {
			currentPage = page;
		}
	}

	// Form ref for bulk delete
	let deleteForm: HTMLFormElement;

	const handleBulkSubmit: SubmitFunction = () => {
		isDeleting = true;
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success(`${selectedCount} space${selectedCount > 1 ? 's' : ''} deleted successfully`);
				rowSelection = {};
				deleteDialogOpen = false;
				await invalidateAll();
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || 'Failed to delete spaces');
			}
			isDeleting = false;
		};
	};

	async function confirmBulkDelete() {
		await tick();
		deleteForm.requestSubmit();
	}

	// Role badge colors
	function getRoleBadgeClass(role: string) {
		switch (role) {
			case 'owner':
				return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20';
			case 'admin':
				return 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20';
			default:
				return 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
		}
	}

	// Filter for role
	let roleFilter = $state('all');
	const roleOptions = [
		{ value: 'all', label: 'All Roles' },
		{ value: 'owner', label: 'Owner' },
		{ value: 'admin', label: 'Admin' },
		{ value: 'member', label: 'Member' }
	];

	// Filter for status
	let statusFilter = $state('all');
	const statusOptions = [
		{ value: 'all', label: 'All Status' },
		{ value: 'active', label: 'Active' },
		{ value: 'paused', label: 'Paused' }
	];

	// Update column filters when role or status filter changes
	$effect(() => {
		const filters: ColumnFiltersState = [];

		if (roleFilter !== 'all') {
			filters.push({ id: 'role', value: roleFilter });
		}

		if (statusFilter !== 'all') {
			filters.push({ id: 'status', value: statusFilter === 'paused' });
		}

		columnFilters = filters;
		currentPage = 0; // Reset to first page when filtering
	});

	// Update global filter and reset page when search changes
	$effect(() => {
		void globalFilter; // Track changes
		currentPage = 0; // Reset to first page when searching
	});
</script>

<!-- Hidden Form for Bulk Delete -->
<form
	bind:this={deleteForm}
	method="POST"
	action="?/bulkDelete"
	use:enhance={handleBulkSubmit}
	class="hidden"
>
	<input type="hidden" name="spaceIds" value={JSON.stringify(selectedIds)} />
</form>

<!-- Filter Toolbar -->
<div class="mb-4 flex flex-wrap items-center gap-4">
	<!-- Search Input -->
	<Input placeholder="Search spaces..." bind:value={globalFilter} class="max-w-sm" />

	<!-- Role Filter -->
	<Select.Root bind:value={roleFilter} type="single">
		<Select.Trigger class="w-[140px]">
			{roleOptions.find((o) => o.value === roleFilter)?.label ?? 'All Roles'}
		</Select.Trigger>
		<Select.Content>
			{#each roleOptions as option}
				<Select.Item value={option.value} label={option.label}>
					{option.label}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	<!-- Status Filter -->
	<Select.Root bind:value={statusFilter} type="single">
		<Select.Trigger class="w-[140px]">
			{statusOptions.find((o) => o.value === statusFilter)?.label ?? 'All Status'}
		</Select.Trigger>
		<Select.Content>
			{#each statusOptions as option}
				<Select.Item value={option.value} label={option.label}>
					{option.label}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</div>

<!-- Bulk Actions Toolbar -->
<div>
	<AnimatedShow when={selectedCount > 0} inAnimation="fly" outAnimation="fade" outDuration={400}>
		{#snippet children()}
			<div class="mb-4 flex items-center justify-between rounded-md border bg-muted/50 px-4 py-3">
				<span class="text-sm font-medium">
					{selectedCount} space{selectedCount === 1 ? '' : 's'} selected
				</span>
				<div class="flex gap-2">
					<Button
						variant="destructive"
						size="sm"
						disabled={isDeleting}
						onclick={() => (deleteDialogOpen = true)}
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					</Button>
				</div>
			</div>
		{/snippet}
	</AnimatedShow>
</div>

<div class="overflow-x-auto rounded-md border">
	<Table.Root class="table-fixed" style="min-width: 900px;">
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup}
				<Table.Row>
					{#each headerGroup.headers as header}
						<Table.Head
							style="width: {header.getSize()}px; min-width: {header.column.columnDef.minSize}px;"
						>
							{#if !header.isPlaceholder}
								{@const columnId = header.column.id}
								{@const isSortable = ['name', 'role', 'formCount', 'memberCount', 'createdAt'].includes(
									columnId
								)}

								{#if isSortable}
									{@const sortDir = getSortDirection(columnId)}
									<button
										onclick={() => handleSort(columnId)}
										class="flex items-center gap-2 font-medium transition-colors hover:text-foreground"
									>
										<FlexRender
											content={header.column.columnDef.header}
											context={header.getContext()}
										/>
										{#if sortDir === 'asc'}
											<ChevronUp class="h-4 w-4" />
										{:else if sortDir === 'desc'}
											<ChevronDown class="h-4 w-4" />
										{:else}
											<ChevronsUpDown class="h-4 w-4" />
										{/if}
									</button>
								{:else}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#if paginatedRows.length}
				{#each paginatedRows as row}
					<Table.Row data-state={row.getIsSelected() && 'selected'}>
						{#each row.getVisibleCells() as cell}
							<Table.Cell
								style="width: {cell.column.getSize()}px; min-width: {cell.column.columnDef
									.minSize}px;"
							>
								{#if cell.column.id === 'name'}
									{@const space = row.original}
									{@const logoUrl = getImageUrl(space.logo, 'thumbnail')}
									<a
										href="/spaces/{space.id}"
										class="flex items-center gap-3 hover:underline"
									>
										{#if logoUrl}
											<Avatar class="h-8 w-8 rounded-lg">
												<AvatarImage
													src={logoUrl}
													srcset="{logoUrl} 1x, {logoUrl.replace('.webp', '@2x.webp')} 2x"
													alt={space.name}
													class="object-cover"
												/>
												<AvatarFallback class="rounded-lg text-sm">
													{space.name.charAt(0).toUpperCase()}
												</AvatarFallback>
											</Avatar>
										{:else}
											<Avatar class="h-8 w-8 rounded-lg">
												<AvatarFallback class="rounded-lg text-sm">
													{space.name.charAt(0).toUpperCase()}
												</AvatarFallback>
											</Avatar>
										{/if}
										<span class="font-medium">{space.name}</span>
										{#if space.isClientOwned && space.privacyIndicatorEnabled}
											<span title="Client-owned space (submissions are private)">
												<ShieldAlert class="h-4 w-4 text-amber-500" />
											</span>
										{/if}
									</a>
								{:else if cell.column.id === 'role'}
									{@const role = row.original.role}
									<span
										class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {getRoleBadgeClass(
											role
										)}"
									>
										{role}
									</span>
								{:else if cell.column.id === 'status'}
									{@const isPaused = row.original.isPaused}
									{#if isPaused}
										<Badge variant="destructive">Paused</Badge>
									{:else}
										<Badge variant="default" class="bg-green-100 text-green-800">Active</Badge>
									{/if}
								{:else if cell.column.id === 'actions'}
									{@const space = row.original}
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button {...props} variant="ghost" size="sm" class="h-8 w-8 p-0">
													<MoreHorizontal class="h-4 w-4" />
													<span class="sr-only">Open menu</span>
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Item onclick={() => goto(`/spaces/${space.id}`)}>
												<ExternalLink class="mr-2 h-4 w-4" />
												View Space
											</DropdownMenu.Item>
											{#if space.role === 'owner' || space.role === 'admin'}
												<DropdownMenu.Item onclick={() => goto(`/spaces/${space.id}/settings`)}>
													<Settings class="mr-2 h-4 w-4" />
													Settings
												</DropdownMenu.Item>
											{/if}
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								{:else}
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								{/if}
							</Table.Cell>
						{/each}
					</Table.Row>
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan={columns.length} class="h-24 text-center">
						No spaces found.
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>

<!-- Pagination Controls -->
{#if totalPages > 1 || processedRows.length > 10}
	<div class="mt-4 flex items-center justify-between">
		<!-- Per Page Selector -->
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground text-sm">Show</span>
			<Select.Root bind:value={perPageValue} type="single">
				<Select.Trigger class="w-[140px]">
					{selectedPerPageLabel}
				</Select.Trigger>
				<Select.Content>
					{#each perPageOptions as option}
						<Select.Item value={option.value} label={option.label}>
							{option.label}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Pagination Buttons -->
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => goToPage(currentPage - 1)}
				disabled={currentPage === 0}
			>
				<ChevronLeft class="h-4 w-4" />
				Previous
			</Button>

			<!-- Page Numbers -->
			<div class="flex items-center gap-1">
				{#if currentPage > 1}
					<Button variant="outline" size="sm" onclick={() => goToPage(0)} class="h-9 w-9 p-0">
						1
					</Button>
					{#if currentPage > 2}
						<span class="text-muted-foreground px-1">...</span>
					{/if}
				{/if}

				{#if currentPage > 0}
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(currentPage - 1)}
						class="h-9 w-9 p-0"
					>
						{currentPage}
					</Button>
				{/if}

				<Button variant="default" size="sm" class="h-9 w-9 p-0">
					{currentPage + 1}
				</Button>

				{#if currentPage < totalPages - 1}
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(currentPage + 1)}
						class="h-9 w-9 p-0"
					>
						{currentPage + 2}
					</Button>
				{/if}

				{#if currentPage < totalPages - 2}
					{#if currentPage < totalPages - 3}
						<span class="text-muted-foreground px-1">...</span>
					{/if}
					<Button
						variant="outline"
						size="sm"
						onclick={() => goToPage(totalPages - 1)}
						class="h-9 w-9 p-0"
					>
						{totalPages}
					</Button>
				{/if}
			</div>

			<Button
				variant="outline"
				size="sm"
				onclick={() => goToPage(currentPage + 1)}
				disabled={currentPage === totalPages - 1}
			>
				Next
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete {selectedCount} space{selectedCount > 1 ? 's' : ''}?</AlertDialog.Title>
			<AlertDialog.Description>
				This action cannot be undone. All forms and submissions in the selected space{selectedCount >
				1
					? 's'
					: ''} will be permanently deleted.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={confirmBulkDelete}
				disabled={isDeleting}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				{isDeleting ? 'Deleting...' : 'Delete'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
