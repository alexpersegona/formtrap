<script lang="ts">
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { getCoreRowModel } from '@tanstack/table-core';
	import type { ColumnDef, VisibilityState } from '@tanstack/table-core';
	import type { Submission } from './submissions-columns';
	import { CheckCircle2, Eye, Trash2, AlertOctagon, ShieldCheck, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Settings2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { tick } from 'svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import AnimatedShow from '$lib/components/AnimatedShow.svelte';
	import { PersistedState, Debounced } from 'runed';
	import SubmissionActions from './submission-actions.svelte';
	import ViewSubmissionDialog from './view-submission-dialog.svelte';
	import DeleteSubmissionDialog from './delete-submission-dialog.svelte';

	interface Props {
		data: Submission[];
		columns: ColumnDef<Submission>[];
		pagination: {
			page: number;
			perPage: number;
			totalPages: number;
			totalCount: number;
		};
		sorting: {
			sortBy: string;
			sortOrder: string;
		};
		isSpamView?: boolean;
	}

	let { data, columns, pagination, sorting, isSpamView = false }: Props = $props();

	let rowSelection = $state<Record<string, boolean>>({});
	let isUpdating = $state(false);

	// Dialog states
	let viewDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedSubmission = $state<Submission | null>(null);
	let isDeleting = $state(false);

	// Persisted preferences (initialize with defaults, then load from localStorage on client)
	let perPageStore = browser
		? new PersistedState('table-per-page', 50)
		: { current: 50 };
	let columnVisibilityStore = browser
		? new PersistedState<VisibilityState>('submissions-table-columns', {})
		: { current: {} };

	// Filter state with debouncing (client-side only)
	let filterInput = $state(browser ? $page.url.searchParams.get('filter') || '' : '');
	let debouncedFilter = browser
		? new Debounced(() => filterInput, 300)
		: { current: '' };

	// Column display names for the visibility dropdown
	const columnDisplayNames: Record<string, string> = {
		name: 'Name',
		email: 'Email',
		createdAt: 'Submitted On',
		status: 'Status',
		spamReason: 'Spam Reason'
	};

	// Helper function to update URL params
	function updateUrlParams(updates: Record<string, string | number>) {
		const url = new URL($page.url);
		Object.entries(updates).forEach(([key, value]) => {
			url.searchParams.set(key, String(value));
		});
		goto(url.toString(), { replaceState: false, noScroll: true, keepFocus: true });
	}

	// Sorting functions
	function handleSort(columnKey: string) {
		if (sorting.sortBy === columnKey) {
			// Toggle sort order
			const newOrder = sorting.sortOrder === 'asc' ? 'desc' : 'asc';
			updateUrlParams({ sortBy: columnKey, sortOrder: newOrder, page: 1 });
		} else {
			// New column, default to desc
			updateUrlParams({ sortBy: columnKey, sortOrder: 'desc', page: 1 });
		}
	}

	function getSortIcon(columnKey: string) {
		if (sorting.sortBy !== columnKey) {
			return ChevronsUpDown;
		}
		return sorting.sortOrder === 'asc' ? ChevronUp : ChevronDown;
	}

	// Pagination functions
	function goToPage(newPage: number) {
		if (newPage >= 1 && newPage <= pagination.totalPages) {
			updateUrlParams({ page: newPage });
		}
	}

	// Per-page options
	const perPageOptions = [
		{ value: '10', label: '10 per page' },
		{ value: '20', label: '20 per page' },
		{ value: '50', label: '50 per page' },
		{ value: '100', label: '100 per page' },
		{ value: '200', label: '200 per page' }
	];

	// Initialize perPage from URL or persisted preference
	let perPageValue = $state(
		String(pagination.perPage || perPageStore.current)
	);

	// Watch for perPageValue changes, save to localStorage and update URL
	$effect(() => {
		const currentPerPage = String(pagination.perPage);
		if (perPageValue !== currentPerPage) {
			perPageStore.current = parseInt(perPageValue);
			updateUrlParams({ perPage: parseInt(perPageValue), page: 1 });
		}
	});

	// Update perPageValue when pagination changes (from URL navigation)
	$effect(() => {
		perPageValue = String(pagination.perPage);
	});

	// Watch for debounced filter changes and update URL
	$effect(() => {
		const currentFilter = $page.url.searchParams.get('filter') || '';
		const newFilter = debouncedFilter.current;

		if (newFilter !== currentFilter) {
			if (newFilter) {
				updateUrlParams({ filter: newFilter, page: 1 });
			} else {
				// Remove filter param if empty
				const url = new URL($page.url);
				url.searchParams.delete('filter');
				url.searchParams.set('page', '1');
				goto(url.toString(), { replaceState: false, noScroll: true, keepFocus: true });
			}
		}
	});

	const selectedPerPageLabel = $derived(
		perPageOptions.find((o) => o.value === perPageValue)?.label ?? '50 per page'
	);

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
		state: {
			get rowSelection() {
				return rowSelection;
			},
			get columnVisibility() {
				return columnVisibilityStore.current;
			}
		},
		enableRowSelection: true,
		onRowSelectionChange: (updaterOrValue) => {
			rowSelection =
				typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;
		},
		onColumnVisibilityChange: (updaterOrValue) => {
			columnVisibilityStore.current =
				typeof updaterOrValue === 'function'
					? updaterOrValue(columnVisibilityStore.current)
					: updaterOrValue;
		}
	});

	const selectedRows = $derived(
		table.getSelectedRowModel().rows.map((row) => row.original)
	);
	const selectedCount = $derived(selectedRows.length);
	const selectedIds = $derived(selectedRows.map((row) => row.id));
	const hasSpamSelected = $derived(selectedRows.some((row) => row.isSpam));

	// Form refs for programmatic submission
	let updateStatusForm: HTMLFormElement;
	let deleteForm: HTMLFormElement;

	// Current action state
	let currentAction = $state<{ status?: string; isSpam?: boolean; notSpam?: boolean }>({});

	const handleBulkSubmit: SubmitFunction = () => {
		isUpdating = true;
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Submissions updated successfully');
				rowSelection = {};
				await invalidateAll();
				await update();
			} else if (result.type === 'failure') {
				toast.error('Failed to update submissions');
			}
			isUpdating = false;
		};
	};

	async function triggerBulkAction(action: 'update' | 'delete', status?: string, isSpam?: boolean, notSpam?: boolean) {
		if (action === 'update') {
			currentAction = { status, isSpam, notSpam };
			// Wait for Svelte to update the DOM with new values
			await tick();
			updateStatusForm.requestSubmit();
		} else {
			deleteForm.requestSubmit();
		}
	}

	// Auto-open submission from URL param (e.g., from email notification link)
	$effect(() => {
		const submissionId = $page.url.searchParams.get('submission');
		if (submissionId && data.length > 0) {
			const submission = data.find((s) => s.id === submissionId);
			if (submission) {
				selectedSubmission = submission;
				viewDialogOpen = true;
				// Clear the param from URL to avoid re-opening on navigation
				const url = new URL($page.url);
				url.searchParams.delete('submission');
				goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
			}
		}
	});

	// Dialog handlers
	function handleView(submission: Submission) {
		selectedSubmission = submission;
		viewDialogOpen = true;
	}

	function handleDelete(submission: Submission) {
		selectedSubmission = submission;
		deleteDialogOpen = true;
	}

	// Form refs for single submission delete
	let deleteSubmissionForm: HTMLFormElement;

	const handleDeleteSubmit: SubmitFunction = () => {
		isDeleting = true;
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Submission deleted successfully');
				deleteDialogOpen = false;
				selectedSubmission = null;
				await invalidateAll();
				await update();
			} else if (result.type === 'failure') {
				toast.error('Failed to delete submission');
			}
			isDeleting = false;
		};
	};

	async function confirmDelete() {
		if (selectedSubmission) {
			await tick();
			deleteSubmissionForm.requestSubmit();
		}
	}

	// Single submission spam toggle
	let singleSpamUpdateForm: HTMLFormElement;
	let singleSpamSubmissionId = $state('');
	let singleSpamAction = $state<'spam' | 'notSpam'>('spam');

	const handleSingleSpamSubmit: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				const message = singleSpamAction === 'spam' ? 'Marked as spam' : 'Marked as not spam';
				toast.success(message);
				await invalidateAll();
				await update();
			} else if (result.type === 'failure') {
				toast.error('Failed to update submission');
			}
		};
	};

	async function handleMarkAsNotSpam(submission: Submission) {
		singleSpamSubmissionId = submission.id;
		singleSpamAction = 'notSpam';
		await tick();
		singleSpamUpdateForm.requestSubmit();
	}

	async function handleMarkAsSpam(submission: Submission) {
		singleSpamSubmissionId = submission.id;
		singleSpamAction = 'spam';
		await tick();
		singleSpamUpdateForm.requestSubmit();
	}
</script>

<!-- Hidden Forms for Bulk Actions -->
<form bind:this={updateStatusForm} method="POST" action="?/bulkUpdateStatus" use:enhance={handleBulkSubmit} class="hidden">
	<input type="hidden" name="submissionIds" value={JSON.stringify(selectedIds)} />
	<input type="hidden" name="status" value={currentAction.status || ''} />
	<input type="hidden" name="isSpam" value={currentAction.isSpam ? 'true' : ''} />
	<input type="hidden" name="notSpam" value={currentAction.notSpam ? 'true' : ''} />
</form>

<form bind:this={deleteForm} method="POST" action="?/bulkDelete" use:enhance={handleBulkSubmit} class="hidden">
	<input type="hidden" name="submissionIds" value={JSON.stringify(selectedIds)} />
</form>

<form bind:this={deleteSubmissionForm} method="POST" action="?/deleteSubmission" use:enhance={handleDeleteSubmit} class="hidden">
	<input type="hidden" name="submissionId" value={selectedSubmission?.id || ''} />
</form>

<form bind:this={singleSpamUpdateForm} method="POST" action="?/bulkUpdateStatus" use:enhance={handleSingleSpamSubmit} class="hidden">
	<input type="hidden" name="submissionIds" value={JSON.stringify([singleSpamSubmissionId])} />
	<input type="hidden" name="status" value="" />
	<input type="hidden" name="isSpam" value={singleSpamAction === 'spam' ? 'true' : ''} />
	<input type="hidden" name="notSpam" value={singleSpamAction === 'notSpam' ? 'true' : ''} />
</form>

<!-- Filter and Column Visibility Toolbar -->
<div class="mb-4 flex items-center justify-between gap-4">
	<!-- Filter Input -->
	<Input
		placeholder="Filter by name or email..."
		bind:value={filterInput}
		class="max-w-sm"
	/>

	<!-- Column Visibility Dropdown -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
			<Settings2 class="mr-2 h-4 w-4" />
			Columns
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Label>Toggle columns</DropdownMenu.Label>
			<DropdownMenu.Separator />
			{#each table.getAllLeafColumns() as column}
				{#if column.getCanHide()}
					<DropdownMenu.CheckboxItem
						checked={column.getIsVisible()}
						onCheckedChange={(value) => column.toggleVisibility(!!value)}
					>
						{columnDisplayNames[column.id] || column.id}
					</DropdownMenu.CheckboxItem>
				{/if}
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

<!-- Bulk Actions Toolbar -->
<div>
	<AnimatedShow when={selectedCount > 0} inAnimation="fly" outAnimation="fade" outDuration={400}>
		{#snippet children()}
			<div class="mb-4 flex items-center justify-between rounded-md border bg-muted/50 px-4 py-3">
			<span class="text-sm font-medium">
				{selectedCount} {selectedCount === 1 ? 'submission' : 'submissions'} selected
			</span>
			<div class="flex gap-2">
				{#if isSpamView || hasSpamSelected}
					<!-- Spam view: show "Mark as Not Spam" action -->
					<Button
						variant="outline"
						size="sm"
						disabled={isUpdating}
						onclick={() => triggerBulkAction('update', undefined, undefined, true)}
					>
						<ShieldCheck class="mr-2 h-4 w-4" />
						Mark as Not Spam
					</Button>
				{:else}
					<!-- Regular view: show status actions -->
					<Button
						variant="outline"
						size="sm"
						disabled={isUpdating}
						onclick={() => triggerBulkAction('update', 'read')}
					>
						<Eye class="mr-2 h-4 w-4" />
						Mark as Read
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={isUpdating}
						onclick={() => triggerBulkAction('update', 'resolved')}
					>
						<CheckCircle2 class="mr-2 h-4 w-4" />
						Mark as Resolved
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={isUpdating}
						onclick={() => triggerBulkAction('update', undefined, true)}
					>
						<AlertOctagon class="mr-2 h-4 w-4" />
						Mark as Spam
					</Button>
				{/if}
				<Button
					variant="destructive"
					size="sm"
					disabled={isUpdating}
					onclick={() => triggerBulkAction('delete')}
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
	<Table.Root class="table-fixed" style="min-width: 800px;">
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup}
				<Table.Row>
					{#each headerGroup.headers as header}
						<Table.Head style="width: {header.getSize()}px; min-width: {header.column.columnDef.minSize}px;">
							{#if !header.isPlaceholder}
								{@const columnId = header.column.id}
								{@const isSortable = ['name', 'email', 'createdAt', 'status'].includes(columnId)}

								{#if isSortable}
									{@const SortIcon = getSortIcon(columnId)}
									<button
										onclick={() => handleSort(columnId)}
										class="flex items-center gap-2 font-medium hover:text-foreground transition-colors"
									>
										<FlexRender content={header.column.columnDef.header} context={header.getContext()} />
										<SortIcon class="h-4 w-4" />
									</button>
								{:else}
									<FlexRender content={header.column.columnDef.header} context={header.getContext()} />
								{/if}
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#if table.getRowModel().rows?.length}
				{#each table.getRowModel().rows as row}
					<Table.Row data-state={row.getIsSelected() && 'selected'}>
						{#each row.getVisibleCells() as cell}
							<Table.Cell style="width: {cell.column.getSize()}px; min-width: {cell.column.columnDef.minSize}px;">
								{#if cell.column.id === 'actions'}
									{@const submission = row.original}
									<SubmissionActions
										{submission}
										onView={handleView}
										onDelete={handleDelete}
										onMarkAsNotSpam={handleMarkAsNotSpam}
										onMarkAsSpam={handleMarkAsSpam}
									/>
								{:else if cell.column.id === 'status'}
									{@const submission = row.original}
									{#if submission.isSpam}
										<Badge variant="destructive">Spam</Badge>
									{:else if submission.status === 'resolved'}
										<Badge variant="default" class="bg-green-100 text-green-800">Resolved</Badge>
									{:else if submission.status === 'read'}
										<Badge variant="secondary">Read</Badge>
									{:else}
										<Badge variant="default" class="bg-blue-100 text-blue-800">New</Badge>
									{/if}
								{:else if cell.column.id === 'name' || cell.column.id === 'email'}
									{@const value = cell.getValue() as string | null}
									<div class="truncate" title={value || ''}>
										<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
									</div>
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
						No submissions yet.
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>

<!-- Pagination Controls -->
{#if pagination.totalPages > 1 || pagination.totalCount > 10}
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
					onclick={() => goToPage(pagination.page - 1)}
					disabled={pagination.page === 1}
				>
					<ChevronLeft class="h-4 w-4" />
					Previous
				</Button>

				<!-- Page Numbers -->
				<div class="flex items-center gap-1">
					{#if pagination.page > 2}
						<Button
							variant="outline"
							size="sm"
							onclick={() => goToPage(1)}
							class="h-9 w-9 p-0"
						>
							1
						</Button>
						{#if pagination.page > 3}
							<span class="text-muted-foreground px-1">...</span>
						{/if}
					{/if}

					{#if pagination.page > 1}
						<Button
							variant="outline"
							size="sm"
							onclick={() => goToPage(pagination.page - 1)}
							class="h-9 w-9 p-0"
						>
							{pagination.page - 1}
						</Button>
					{/if}

					<Button
						variant="default"
						size="sm"
						class="h-9 w-9 p-0"
					>
						{pagination.page}
					</Button>

					{#if pagination.page < pagination.totalPages}
						<Button
							variant="outline"
							size="sm"
							onclick={() => goToPage(pagination.page + 1)}
							class="h-9 w-9 p-0"
						>
							{pagination.page + 1}
						</Button>
					{/if}

					{#if pagination.page < pagination.totalPages - 1}
						{#if pagination.page < pagination.totalPages - 2}
							<span class="text-muted-foreground px-1">...</span>
						{/if}
						<Button
							variant="outline"
							size="sm"
							onclick={() => goToPage(pagination.totalPages)}
							class="h-9 w-9 p-0"
						>
							{pagination.totalPages}
						</Button>
					{/if}
				</div>

				<Button
					variant="outline"
					size="sm"
					onclick={() => goToPage(pagination.page + 1)}
					disabled={pagination.page === pagination.totalPages}
				>
					Next
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
	</div>
{/if}

<!-- View Submission Dialog -->
<ViewSubmissionDialog
	bind:open={viewDialogOpen}
	submission={selectedSubmission}
	onOpenChange={(open) => viewDialogOpen = open}
	onDelete={handleDelete}
/>

<!-- Delete Submission Dialog -->
<DeleteSubmissionDialog
	bind:open={deleteDialogOpen}
	submission={selectedSubmission}
	onOpenChange={(open) => deleteDialogOpen = open}
	onConfirm={confirmDelete}
	loading={isDeleting}
/>
