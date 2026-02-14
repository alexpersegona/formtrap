<script lang="ts">
	import type { PageData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import InboxFilters from '$lib/components/inbox-filters.svelte';
	import {
		FileText,
		Edit,
		Trash2,
		Copy,
		CheckCircle2,
		Link as LinkIcon,
		Download,
		FileSpreadsheet,
		FileType,
		Clock,
		ChevronRight,
		ChevronLeft,
		ArrowUpDown,
		AlertOctagon,
		ShieldCheck,
		ExternalLink,
		Globe,
		Monitor,
		Smartphone,
		Archive,
		ArchiveRestore
	} from 'lucide-svelte';
	import { formatDistanceToNow, format } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { tick } from 'svelte';
	import { PUBLIC_SUBMISSION_ENDPOINT } from '$env/static/public';
	import type { Submission } from './submissions-columns';
	import {
		CalendarDate,
		parseDate,
		type DateValue
	} from '@internationalized/date';

	let { data }: { data: PageData } = $props();

	let deleteFormDialogOpen = $state(false);
	let deletingForm = $state(false);
	let deleteFormConfirmText = $state('');
	let canDeleteForm = $derived(deleteFormConfirmText.toLowerCase() === data.form.name.toLowerCase());
	let deleteSubmissionDialogOpen = $state(false);
	let deletingSubmission = $state(false);

	// Selection state
	let selectedId = $state<string | null>(null);
	let mobileDetailOpen = $state(false);

	// Sort state
	type SortOption = 'newest' | 'oldest';
	let sortBy = $state<SortOption>('newest');

	// Filter state from URL
	const activeFilter = $derived(data.filter as 'all' | 'unread' | 'resolved' | 'archived' | 'spam');

	// Date range state
	interface DateRange {
		start: DateValue | undefined;
		end: DateValue | undefined;
	}

	function parseDateString(dateStr: string | null): DateValue | undefined {
		if (!dateStr) return undefined;
		try {
			return parseDate(dateStr);
		} catch {
			return undefined;
		}
	}

	let dateRange = $state<DateRange>({
		start: parseDateString(data.dateRange.from),
		end: parseDateString(data.dateRange.to)
	});

	// Sorted submissions (uses server-provided data)
	const sortedSubmissions = $derived(() => {
		const sorted = [...(data.submissions as Submission[])];
		if (sortBy === 'oldest') {
			sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		} else {
			sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		}
		return sorted;
	});

	const selectedSubmission = $derived(
		sortedSubmissions().find((s) => s.id === selectedId) as Submission | undefined
	);
	const selectedIndex = $derived(sortedSubmissions().findIndex((s) => s.id === selectedId));

	// Bulk selection state
	let selectedIds = $state<Set<string>>(new Set());

	function toggleSelect(id: string) {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedIds = newSet;
	}

	function toggleSelectAll() {
		if (selectedIds.size === sortedSubmissions().length) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(sortedSubmissions().map((s) => s.id));
		}
	}

	function handleItemClick(e: MouseEvent, id: string) {
		if (e.shiftKey || e.ctrlKey || e.metaKey) {
			e.preventDefault();
			toggleSelect(id);
		} else {
			selectSubmission(id);
		}
	}

	async function bulkUpdateStatus(status?: string, isSpam?: boolean, notSpam?: boolean, archive?: boolean, unarchive?: boolean) {
		if (selectedIds.size === 0) return;
		currentAction = { status, isSpam, notSpam, archive, unarchive };
		const form = document.getElementById('bulk-action-form') as HTMLFormElement;
		if (form) {
			await tick();
			form.requestSubmit();
		}
	}

	async function bulkDelete() {
		if (selectedIds.size === 0) return;
		const form = document.getElementById('bulk-delete-form') as HTMLFormElement;
		if (form) {
			await tick();
			form.requestSubmit();
		}
	}

	// Clear bulk selection when switching filters
	$effect(() => {
		if (activeFilter) {
			selectedIds = new Set();
		}
	});

	// Handle filter change
	function handleFilterChange(filter: string) {
		const url = new URL($page.url);
		url.searchParams.delete('page');

		if (filter === 'all') {
			url.searchParams.delete('filter');
		} else {
			url.searchParams.set('filter', filter);
		}
		goto(url.toString(), { replaceState: true, keepFocus: true });
		selectedId = null;
	}

	// Handle date range change
	function handleDateRangeChange(range: DateRange) {
		dateRange = range;
		const url = new URL($page.url);
		url.searchParams.delete('page');

		if (range.start) {
			url.searchParams.set('dateFrom', `${range.start.year}-${String(range.start.month).padStart(2, '0')}-${String(range.start.day).padStart(2, '0')}`);
		} else {
			url.searchParams.delete('dateFrom');
		}

		if (range.end) {
			url.searchParams.set('dateTo', `${range.end.year}-${String(range.end.month).padStart(2, '0')}-${String(range.end.day).padStart(2, '0')}`);
		} else {
			url.searchParams.delete('dateTo');
		}

		goto(url.toString(), { replaceState: true, keepFocus: true });
	}

	// Handle page navigation
	function goToPage(pageNum: number) {
		const url = new URL(get(page).url);
		if (pageNum === 1) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', pageNum.toString());
		}
		goto(url.toString(), { replaceState: false, keepFocus: true });
		selectedId = null; // Clear selection on page change
	}

	const handleDeleteForm: SubmitFunction = () => {
		deletingForm = true;
		return async ({ update }) => {
			deletingForm = false;
			await update();
		};
	};

	// Form endpoint URL - points to Go Gin service
	const formEndpointUrl = $derived(`${PUBLIC_SUBMISSION_ENDPOINT}/forms/${data.form.id}`);

	let copied = $state(false);

	async function copyEndpointUrl() {
		try {
			await navigator.clipboard.writeText(formEndpointUrl);
			copied = true;
			toast.success('Form endpoint URL copied to clipboard');
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			toast.error('Failed to copy to clipboard');
		}
	}

	// Export functionality
	let exportForm: HTMLFormElement;
	let exportFormat = $state<'csv' | 'txt'>('csv');
	let exporting = $state(false);

	const handleExport: SubmitFunction = () => {
		exporting = true;
		return async ({ result }) => {
			exporting = false;
			if (result.type === 'success' && result.data?.success) {
				const submissions = result.data.submissions as Array<{
					id: string;
					name: string | null;
					email: string | null;
					status: string;
					isSpam: boolean;
					isArchived: boolean;
					data: unknown;
					files: Array<{ name: string; url?: string; path?: string }> | null;
					createdAt: Date;
					ipAddress: string | null;
					device: string | null;
					browser: string | null;
					os: string | null;
				}>;

				if (submissions.length === 0) {
					toast.error('No submissions to export');
					return;
				}

				const fmt = result.data.format as string;
				if (fmt === 'csv') {
					downloadCSV(submissions);
				} else {
					downloadTXT(submissions);
				}
				toast.success(`Exported ${submissions.length} submissions`);
			} else {
				toast.error('Failed to export submissions');
			}
		};
	};

	function downloadCSV(submissions: Array<Record<string, unknown>>) {
		const dataKeys = new Set<string>();
		submissions.forEach((s) => {
			if (s.data && typeof s.data === 'object') {
				Object.keys(s.data as Record<string, unknown>).forEach((key) => dataKeys.add(key));
			}
		});

		const headers = [
			'ID',
			'Name',
			'Email',
			'Status',
			'Is Spam',
			'Is Archived',
			'Created At',
			'IP Address',
			'Device',
			'Browser',
			'OS',
			'Files',
			...Array.from(dataKeys)
		];

		const rows = submissions.map((s) => {
			const dataObj = (s.data || {}) as Record<string, unknown>;
			const filesArray = s.files as Array<{ name: string; url?: string; path?: string }> | null;
			const filesStr =
				filesArray && filesArray.length > 0
					? filesArray.map((f) => `${f.name} (${f.url || f.path || ''})`).join('; ')
					: '';
			const row = [
				s.id,
				s.name || '',
				s.email || '',
				s.status,
				s.isSpam ? 'Yes' : 'No',
				s.isArchived ? 'Yes' : 'No',
				s.createdAt ? format(new Date(s.createdAt as string), 'yyyy-MM-dd HH:mm:ss') : '',
				s.ipAddress || '',
				s.device || '',
				s.browser || '',
				s.os || '',
				filesStr,
				...Array.from(dataKeys).map((key) => {
					const value = dataObj[key];
					if (value === null || value === undefined) return '';
					if (typeof value === 'object') return JSON.stringify(value);
					return String(value);
				})
			];
			return row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
		});

		const csv = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
		downloadFile(csv, `${data.form.name}-submissions.csv`, 'text/csv');
	}

	function downloadTXT(submissions: Array<Record<string, unknown>>) {
		const lines = submissions.map((s, index) => {
			const dataObj = (s.data || {}) as Record<string, unknown>;
			const dataLines = Object.entries(dataObj)
				.map(([key, value]) => {
					if (value === null || value === undefined) return `  ${key}: (empty)`;
					if (typeof value === 'object') return `  ${key}: ${JSON.stringify(value)}`;
					return `  ${key}: ${value}`;
				})
				.join('\n');

			const filesArray = s.files as Array<{ name: string; url?: string; path?: string }> | null;
			const filesLines =
				filesArray && filesArray.length > 0
					? filesArray.map((f) => `  - ${f.name}: ${f.url || f.path || '(no URL)'}`).join('\n')
					: '  (no files)';

			return `--- Submission ${index + 1} ---
ID: ${s.id}
Name: ${s.name || '(not provided)'}
Email: ${s.email || '(not provided)'}
Status: ${s.status}
Is Spam: ${s.isSpam ? 'Yes' : 'No'}
Is Archived: ${s.isArchived ? 'Yes' : 'No'}
Created: ${s.createdAt ? format(new Date(s.createdAt as string), 'yyyy-MM-dd HH:mm:ss') : 'Unknown'}
IP Address: ${s.ipAddress || '(not recorded)'}
Device: ${s.device || '(not recorded)'}
Browser: ${s.browser || '(not recorded)'}
OS: ${s.os || '(not recorded)'}

Form Data:
${dataLines || '  (no data)'}

File Uploads:
${filesLines}
`;
		});

		const txt = `Submissions Export for: ${data.form.name}
Exported on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
Total submissions: ${submissions.length}

${'='.repeat(50)}

${lines.join('\n' + '='.repeat(50) + '\n\n')}`;

		downloadFile(txt, `${data.form.name}-submissions.txt`, 'text/plain');
	}

	function downloadFile(content: string, filename: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function triggerExport(format: 'csv' | 'txt') {
		exportFormat = format;
		await tick();
		exportForm.requestSubmit();
	}

	// Select submission
	function selectSubmission(id: string, shouldScrollIntoView = false) {
		selectedId = id;
		mobileDetailOpen = true;

		if (shouldScrollIntoView) {
			tick().then(() => {
				const element = document.querySelector(`[data-submission-id="${id}"]`);
				element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
			});
		}
	}

	function closeMobileDetail() {
		mobileDetailOpen = false;
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (!sortedSubmissions().length) return;

		if (event.key === 'ArrowDown' || event.key === 'j') {
			event.preventDefault();
			(document.activeElement as HTMLElement)?.blur();
			const currentIndex = selectedIndex;
			const nextIndex = currentIndex < sortedSubmissions().length - 1 ? currentIndex + 1 : 0;
			selectSubmission(sortedSubmissions()[nextIndex].id, true);
		} else if (event.key === 'ArrowUp' || event.key === 'k') {
			event.preventDefault();
			(document.activeElement as HTMLElement)?.blur();
			const currentIndex = selectedIndex;
			const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedSubmissions().length - 1;
			selectSubmission(sortedSubmissions()[prevIndex].id, true);
		} else if (event.key === 'Escape' && mobileDetailOpen) {
			event.preventDefault();
			closeMobileDetail();
		}
	}

	// Auto-select first submission when data changes
	$effect(() => {
		if (sortedSubmissions().length > 0 && !selectedId) {
			selectedId = sortedSubmissions()[0].id;
		}
	});

	// Clear selection when switching filters
	$effect(() => {
		if (activeFilter) {
			selectedId = null;
		}
	});

	// Parse submission data
	const parsedData = $derived(
		selectedSubmission?.data
			? typeof selectedSubmission.data === 'string'
				? JSON.parse(selectedSubmission.data)
				: selectedSubmission.data
			: {}
	);

	// Parse files data if it exists
	const parsedFiles = $derived(
		selectedSubmission && 'files' in selectedSubmission && selectedSubmission.files
			? typeof selectedSubmission.files === 'string'
				? JSON.parse(selectedSubmission.files)
				: selectedSubmission.files
			: []
	);

	// Status actions
	let updateStatusForm: HTMLFormElement;
	let currentAction = $state<{ status?: string; isSpam?: boolean; notSpam?: boolean; archive?: boolean; unarchive?: boolean }>({});
	let isUpdating = $state(false);

	const handleStatusUpdate: SubmitFunction = () => {
		isUpdating = true;
		return async ({ result }) => {
			if (result.type === 'success') {
				toast.success('Submission updated');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to update submission');
			}
			isUpdating = false;
		};
	};

	const handleBulkAction: SubmitFunction = () => {
		isUpdating = true;
		return async ({ result }) => {
			if (result.type === 'success') {
				toast.success(`${selectedIds.size} submissions updated`);
				selectedIds = new Set();
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to update submissions');
			}
			isUpdating = false;
		};
	};

	async function updateStatus(status?: string, isSpam?: boolean, notSpam?: boolean, archive?: boolean, unarchive?: boolean) {
		if (!selectedSubmission) return;
		currentAction = { status, isSpam, notSpam, archive, unarchive };
		await tick();
		updateStatusForm.requestSubmit();
	}

	// Delete submission
	let deleteSubmissionForm: HTMLFormElement;

	const handleDeleteSubmission: SubmitFunction = () => {
		deletingSubmission = true;
		return async ({ result }) => {
			if (result.type === 'success') {
				toast.success('Submission deleted');
				deleteSubmissionDialogOpen = false;
				selectedId = null;
				mobileDetailOpen = false;
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to delete submission');
			}
			deletingSubmission = false;
		};
	};

	async function confirmDeleteSubmission() {
		if (selectedSubmission) {
			await tick();
			deleteSubmissionForm.requestSubmit();
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	}

	// Helper functions
	function timeAgo(date: Date | string) {
		return formatDistanceToNow(new Date(date), { addSuffix: true });
	}

	function getPreviewText(submission: Submission): string {
		const dataObj =
			submission.data && typeof submission.data === 'string'
				? JSON.parse(submission.data)
				: submission.data || {};

		const messageFields = ['message', 'content', 'body', 'description', 'text', 'comment'];
		for (const field of messageFields) {
			if (dataObj[field] && typeof dataObj[field] === 'string') {
				return dataObj[field].slice(0, 80);
			}
		}

		for (const value of Object.values(dataObj)) {
			if (typeof value === 'string' && value.length > 10) {
				return value.slice(0, 80);
			}
		}

		return 'No preview available';
	}

	// Accordion state for metadata
	let metadataOpenValue = $state<string | undefined>(undefined);

	// Current count based on filter
	const currentCount = $derived(data.pagination.totalCount);

	// Format date for export form
	function formatDateForExport(date: DateValue | undefined): string {
		if (!date) return '';
		return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>{data.form.name} - {data.space.name}</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<!-- Hidden Export Form -->
<form
	bind:this={exportForm}
	method="POST"
	action="?/exportSubmissions"
	use:enhance={handleExport}
	class="hidden"
>
	<input type="hidden" name="format" value={exportFormat} />
	<input type="hidden" name="filter" value={activeFilter} />
	<input type="hidden" name="dateFrom" value={formatDateForExport(dateRange.start)} />
	<input type="hidden" name="dateTo" value={formatDateForExport(dateRange.end)} />
</form>

<!-- Hidden Status Update Form -->
<form
	bind:this={updateStatusForm}
	method="POST"
	action="?/bulkUpdateStatus"
	use:enhance={handleStatusUpdate}
	class="hidden"
>
	<input type="hidden" name="submissionIds" value={JSON.stringify([selectedId])} />
	<input type="hidden" name="status" value={currentAction.status || ''} />
	<input type="hidden" name="isSpam" value={currentAction.isSpam ? 'true' : ''} />
	<input type="hidden" name="notSpam" value={currentAction.notSpam ? 'true' : ''} />
	<input type="hidden" name="archive" value={currentAction.archive ? 'true' : ''} />
	<input type="hidden" name="unarchive" value={currentAction.unarchive ? 'true' : ''} />
</form>

<!-- Hidden Delete Submission Form -->
<form
	bind:this={deleteSubmissionForm}
	method="POST"
	action="?/deleteSubmission"
	use:enhance={handleDeleteSubmission}
	class="hidden"
>
	<input type="hidden" name="submissionId" value={selectedSubmission?.id || ''} />
</form>

<!-- Hidden Bulk Action Form -->
<form
	id="bulk-action-form"
	method="POST"
	action="?/bulkUpdateStatus"
	use:enhance={handleBulkAction}
	class="hidden"
>
	<input type="hidden" name="submissionIds" value={JSON.stringify([...selectedIds])} />
	<input type="hidden" name="status" value={currentAction.status || ''} />
	<input type="hidden" name="isSpam" value={currentAction.isSpam ? 'true' : ''} />
	<input type="hidden" name="notSpam" value={currentAction.notSpam ? 'true' : ''} />
	<input type="hidden" name="archive" value={currentAction.archive ? 'true' : ''} />
	<input type="hidden" name="unarchive" value={currentAction.unarchive ? 'true' : ''} />
</form>

<!-- Hidden Bulk Delete Form -->
<form
	id="bulk-delete-form"
	method="POST"
	action="?/bulkDelete"
	use:enhance={handleBulkAction}
	class="hidden"
>
	<input type="hidden" name="submissionIds" value={JSON.stringify([...selectedIds])} />
</form>

<!-- Header -->
<div class="mb-6">
	<div class="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
		<div class="min-w-0 flex-1">
			<div class="mb-2 flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-bold md:text-3xl">{data.form.name}</h1>
				{#if data.form.isActive}
					<Badge variant="default" class="bg-green-100 text-green-800">Active</Badge>
				{:else}
					<Badge variant="secondary">Inactive</Badge>
				{/if}
			</div>
			{#if data.form.description}
				<p class="text-muted-foreground mb-3">{data.form.description}</p>
			{/if}

			<!-- Endpoint URL -->
			<div class="text-muted-foreground flex items-center gap-1.5 text-sm">
				<div class="flex min-w-0 items-center gap-1.5">
					<LinkIcon class="h-3.5 w-3.5 flex-shrink-0" />
					<span class="truncate font-mono text-xs">{formEndpointUrl}</span>
					<button
						onclick={copyEndpointUrl}
						class="text-muted-foreground hover:text-foreground ml-0.5 flex-shrink-0 transition-colors"
						aria-label="Copy form endpoint URL"
					>
						{#if copied}
							<CheckCircle2 class="h-3.5 w-3.5 text-green-600" />
						{:else}
							<Copy class="h-3.5 w-3.5" />
						{/if}
					</button>
				</div>
			</div>
		</div>

		<div class="flex flex-shrink-0 gap-2">
			<Button href="/spaces/{data.space.id}/forms/{data.form.id}/edit" variant="outline">
				<Edit class="mr-2 h-4 w-4" />
				Edit
			</Button>

			<Dialog.Root bind:open={deleteFormDialogOpen} onOpenChange={(open) => { if (!open) deleteFormConfirmText = ''; }}>
				<Dialog.Trigger>
					<Button variant="destructive">
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title class="text-destructive">Delete Form Permanently?</Dialog.Title>
						<Dialog.Description>
							This action is <strong class="text-foreground">irreversible</strong>. All submissions and uploaded files
							will be permanently deleted.
						</Dialog.Description>
					</Dialog.Header>
					<form method="POST" action="?/delete" use:enhance={handleDeleteForm} class="space-y-4">
						<div class="space-y-2">
							<Label for="delete-confirm">Type <strong class="font-mono text-foreground">{data.form.name.toLowerCase()}</strong> to confirm:</Label>
							<Input
								id="delete-confirm"
								bind:value={deleteFormConfirmText}
								placeholder={data.form.name.toLowerCase()}
								autocomplete="off"
							/>
						</div>
						<Dialog.Footer>
							<Button type="button" variant="outline" onclick={() => (deleteFormDialogOpen = false)}>
								Cancel
							</Button>
							<Button type="submit" variant="destructive" disabled={deletingForm || !canDeleteForm}>
								{deletingForm ? 'Deleting...' : 'Delete Forever'}
							</Button>
						</Dialog.Footer>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</div>
</div>

<!-- Filters -->
<div class="mb-6 flex items-center justify-between">
	<InboxFilters
		filter={activeFilter}
		counts={data.counts}
		bind:dateRange
		onFilterChange={handleFilterChange}
		onDateRangeChange={handleDateRangeChange}
	/>

	{#if currentCount > 0}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="sm" disabled={exporting}>
						<Download class="mr-2 h-4 w-4" />
						{exporting ? 'Exporting...' : 'Export'}
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Item onclick={() => triggerExport('csv')}>
					<FileSpreadsheet class="mr-2 h-4 w-4" />
					Download as CSV
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => triggerExport('txt')}>
					<FileType class="mr-2 h-4 w-4" />
					Download as TXT
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</div>

<!-- Submissions Content -->
<Card.Root class="overflow-hidden p-0">
	{#if currentCount === 0}
		<div class="py-16 text-center text-muted-foreground">
			<FileText class="mx-auto mb-4 h-12 w-12 opacity-50" />
			<p class="font-medium">
				{#if activeFilter === 'all'}
					No submissions yet
				{:else if activeFilter === 'unread'}
					No unread submissions
				{:else if activeFilter === 'resolved'}
					No resolved submissions
				{:else if activeFilter === 'archived'}
					No archived submissions
				{:else if activeFilter === 'spam'}
					No spam detected
				{/if}
			</p>
			<p class="mt-2 text-sm">
				{#if activeFilter === 'all'}
					Submissions will appear here once the form starts receiving data
				{:else}
					Change the filter to see other submissions
				{/if}
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-340px)] min-h-[500px]">
			<!-- Submission List -->
			<div
				class="lg:col-span-1 lg:border-r overflow-hidden flex flex-col {mobileDetailOpen
					? 'hidden lg:flex'
					: ''}"
			>
				<!-- Sort Controls & Bulk Actions -->
				<div class="flex items-center justify-between py-3 pl-4 pr-3 border-b bg-muted/30">
					<div class="flex items-center gap-3">
						<Checkbox
							checked={selectedIds.size === sortedSubmissions().length && sortedSubmissions().length > 0}
							indeterminate={selectedIds.size > 0 && selectedIds.size < sortedSubmissions().length}
							onCheckedChange={toggleSelectAll}
							aria-label="Select all"
						/>
						<span class="text-sm text-muted-foreground">
							{currentCount}
							{currentCount === 1 ? 'submission' : 'submissions'}
						</span>
					</div>
					<Select.Root type="single" bind:value={sortBy}>
						<Select.Trigger class="h-8 w-[130px] text-xs [&>svg:last-child]:hidden">
							<ArrowUpDown class="mr-1.5 h-3 w-3" />
							{sortBy === 'newest' ? 'Newest first' : 'Oldest first'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="newest">Newest first</Select.Item>
							<Select.Item value="oldest">Oldest first</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Bulk Actions Bar -->
				{#if selectedIds.size > 0}
					<div class="flex items-center justify-between py-2 pl-4 pr-2 border-b bg-primary/5">
						<span class="text-sm font-medium">
							{selectedIds.size} selected
						</span>
						<div class="flex items-center gap-1">
							{#if activeFilter !== 'archived'}
								<Button variant="ghost" size="sm" onclick={() => bulkUpdateStatus('resolved')} disabled={isUpdating} title="Mark as resolved">
									<CheckCircle2 class="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="sm" onclick={() => bulkUpdateStatus(undefined, undefined, undefined, true)} disabled={isUpdating} title="Archive">
									<Archive class="h-4 w-4" />
								</Button>
							{:else}
								<Button variant="ghost" size="sm" onclick={() => bulkUpdateStatus(undefined, undefined, undefined, undefined, true)} disabled={isUpdating} title="Unarchive">
									<ArchiveRestore class="h-4 w-4" />
								</Button>
							{/if}
							{#if activeFilter !== 'spam'}
								<Button variant="ghost" size="sm" onclick={() => bulkUpdateStatus(undefined, true)} disabled={isUpdating} title="Mark as spam">
									<AlertOctagon class="h-4 w-4" />
								</Button>
							{:else}
								<Button variant="ghost" size="sm" onclick={() => bulkUpdateStatus(undefined, undefined, true)} disabled={isUpdating} title="Not spam">
									<ShieldCheck class="h-4 w-4" />
								</Button>
							{/if}
							<Button variant="ghost" size="sm" onclick={() => bulkDelete()} disabled={isUpdating} class="text-destructive hover:text-destructive" title="Delete">
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/if}

				<div class="flex-1 min-h-0 overflow-y-auto scroll-shadows">
					{#each sortedSubmissions() as submission (submission.id)}
						<button
							onclick={(e) => handleItemClick(e, submission.id)}
							data-submission-id={submission.id}
							class="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors focus:outline-none border-b
								{selectedId === submission.id ? 'bg-accent' : ''}
								{selectedIds.has(submission.id) ? 'bg-primary/10' : ''}
								{submission.status === 'new' && !selectedIds.has(submission.id) ? 'bg-blue-500/5' : ''}"
						>
							<div class="flex items-start gap-3">
								<div class="flex-shrink-0 mt-0.5" onclick={(e) => { e.stopPropagation(); toggleSelect(submission.id); }}>
									<Checkbox
										checked={selectedIds.has(submission.id)}
										onCheckedChange={() => toggleSelect(submission.id)}
										aria-label="Select submission"
									/>
								</div>
								<div class="flex-1 min-w-0 flex flex-col">
									<div class="flex items-center gap-2">
										<p
											class="flex-1 min-w-0 font-medium truncate {submission.status === 'new'
												? 'text-foreground'
												: 'text-muted-foreground'}"
										>
											{submission.name || submission.email || 'Anonymous'}
										</p>
										<span class="text-xs text-muted-foreground flex-shrink-0">
											{timeAgo(submission.createdAt)}
										</span>
									</div>
									{#if submission.email && submission.name}
										<p class="text-sm text-muted-foreground truncate">{submission.email}</p>
									{/if}
									<p class="text-xs text-muted-foreground truncate mt-0.5">
										{getPreviewText(submission)}...
									</p>
									<div class="flex items-center gap-1.5 mt-1.5">
										{#if submission.status === 'new'}
											<Badge variant="default" class="text-xs py-0 bg-blue-100 text-blue-800">New</Badge>
										{:else if submission.status === 'resolved'}
											<Badge variant="default" class="text-xs py-0 bg-green-100 text-green-800">Resolved</Badge>
										{/if}
										{#if submission.isSpam}
											<Badge variant="destructive" class="text-xs py-0">Spam</Badge>
										{/if}
										{#if submission.isArchived}
											<Badge variant="secondary" class="text-xs py-0">Archived</Badge>
										{/if}
									</div>
								</div>
								{#if selectedId === submission.id}
									<ChevronRight class="h-4 w-4 text-muted-foreground flex-shrink-0 hidden lg:block" />
								{/if}
							</div>
						</button>
					{/each}
				</div>

				<!-- Pagination Controls -->
				{#if data.pagination.totalPages > 1}
					<div class="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
						<Button
							variant="ghost"
							size="sm"
							disabled={data.pagination.page === 1}
							onclick={() => goToPage(data.pagination.page - 1)}
						>
							<ChevronLeft class="h-4 w-4 mr-1" />
							Previous
						</Button>
						<span class="text-sm text-muted-foreground">
							Page {data.pagination.page} of {data.pagination.totalPages}
						</span>
						<Button
							variant="ghost"
							size="sm"
							disabled={data.pagination.page === data.pagination.totalPages}
							onclick={() => goToPage(data.pagination.page + 1)}
						>
							Next
							<ChevronRight class="h-4 w-4 ml-1" />
						</Button>
					</div>
				{/if}
			</div>

			<!-- Submission Detail -->
			<div class="lg:col-span-2 p-6 overflow-y-auto {!mobileDetailOpen ? 'hidden lg:block' : ''}">
				{#if selectedSubmission}
					<!-- Mobile Back Button -->
					<button
						onclick={closeMobileDetail}
						class="lg:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 -ml-1"
					>
						<ChevronLeft class="h-4 w-4" />
						Back to list
					</button>

					<div class="space-y-6">
						<!-- Header -->
						<div class="flex items-start justify-between">
							<div>
								<h2 class="text-xl font-semibold">
									{selectedSubmission.name || selectedSubmission.email || 'Anonymous Submission'}
								</h2>
								{#if selectedSubmission.email}
									<div class="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
										<span>&lt;{selectedSubmission.email}&gt;</span>
									</div>
								{/if}
								<div class="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
									<Clock class="h-3 w-3" />
									<span>{format(new Date(selectedSubmission.createdAt), 'PPpp')}</span>
								</div>
							</div>

							<div class="flex items-center gap-1 flex-wrap justify-end">
								{#if selectedSubmission.status === 'new'}
									<Badge variant="default" class="bg-blue-100 text-blue-800">New</Badge>
								{:else if selectedSubmission.status === 'resolved'}
									<Badge variant="default" class="bg-green-100 text-green-800">Resolved</Badge>
								{:else}
									<Badge variant="secondary">Read</Badge>
								{/if}
								{#if selectedSubmission.isSpam}
									<Badge variant="destructive">Spam</Badge>
								{/if}
								{#if selectedSubmission.isArchived}
									<Badge variant="secondary">Archived</Badge>
								{/if}
							</div>
						</div>

						<!-- Spam Reason Alert -->
						{#if selectedSubmission.isSpam && selectedSubmission.spamReason}
							<div class="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
								<p class="text-sm font-medium text-destructive">
									Spam Reason: {selectedSubmission.spamReason.replace(/_/g, ' ')}
								</p>
							</div>
						{/if}

						<!-- Form Data -->
						<div class="border rounded-lg">
							<div class="p-4 border-b bg-muted/30">
								<h3 class="font-medium">Form Data</h3>
							</div>
							<div class="p-4">
								<div class="space-y-3">
									{#each Object.entries(parsedData) as [fieldName, fieldValue]}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b last:border-0">
											<div class="font-medium text-sm text-muted-foreground capitalize">
												{fieldName.replace(/_/g, ' ')}
											</div>
											<div class="md:col-span-2 text-sm break-words whitespace-pre-wrap">
												{#if Array.isArray(fieldValue)}
													{fieldValue.join(', ')}
												{:else if typeof fieldValue === 'object' && fieldValue !== null}
													{JSON.stringify(fieldValue, null, 2)}
												{:else}
													{fieldValue || '-'}
												{/if}
											</div>
										</div>
									{/each}

									{#if Object.keys(parsedData).length === 0}
										<p class="text-sm text-muted-foreground">No form data available</p>
									{/if}
								</div>
							</div>
						</div>

						<!-- File Uploads -->
						{#if parsedFiles.length > 0}
							<div class="border rounded-lg">
								<div class="p-4 border-b bg-muted/30">
									<h3 class="font-medium">File Uploads</h3>
								</div>
								<div class="p-4">
									<div class="space-y-3">
										{#each parsedFiles as file}
											<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b last:border-0">
												<div class="font-medium text-sm text-muted-foreground">
													{file.field || 'File'}
												</div>
												<div class="md:col-span-2 flex items-center gap-2">
													<a
														href={file.url || file.path}
														target="_blank"
														rel="noopener noreferrer"
														class="text-sm text-primary hover:underline flex items-center gap-1"
													>
														{file.name}
														<ExternalLink class="h-3 w-3" />
													</a>
													<Button
														variant="ghost"
														size="icon"
														class="h-6 w-6"
														onclick={() => copyToClipboard(file.url || file.path)}
													>
														<Copy class="h-3 w-3" />
													</Button>
													{#if file.size}
														<span class="text-xs text-muted-foreground">
															({(file.size / 1024).toFixed(1)} KB)
														</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/if}

						<!-- Metadata Accordion -->
						<Accordion.Root bind:value={metadataOpenValue} type="single" collapsible>
							<Accordion.Item value="metadata" class="border rounded-lg">
								<Accordion.Trigger class="px-4 text-sm font-medium">
									Technical Metadata
								</Accordion.Trigger>
								<Accordion.Content>
									{#if metadataOpenValue === 'metadata'}
										<div class="space-y-3 px-4 pb-4">
											{#if selectedSubmission.ipAddress}
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
													<div class="font-medium text-sm text-muted-foreground flex items-center gap-1">
														<Globe class="h-3 w-3" />
														IP Address
													</div>
													<div class="md:col-span-2 text-sm font-mono">
														{selectedSubmission.ipAddress}
													</div>
												</div>
											{/if}

											{#if selectedSubmission.device}
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
													<div class="font-medium text-sm text-muted-foreground flex items-center gap-1">
														<Smartphone class="h-3 w-3" />
														Device
													</div>
													<div class="md:col-span-2 text-sm">
														{selectedSubmission.device}
													</div>
												</div>
											{/if}

											{#if selectedSubmission.os}
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
													<div class="font-medium text-sm text-muted-foreground flex items-center gap-1">
														<Monitor class="h-3 w-3" />
														Operating System
													</div>
													<div class="md:col-span-2 text-sm">
														{selectedSubmission.os}
													</div>
												</div>
											{/if}

											{#if selectedSubmission.browser}
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
													<div class="font-medium text-sm text-muted-foreground flex items-center gap-1">
														<Globe class="h-3 w-3" />
														Browser
													</div>
													<div class="md:col-span-2 text-sm">
														{selectedSubmission.browser}
													</div>
												</div>
											{/if}

											{#if selectedSubmission.userAgent}
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
													<div class="font-medium text-sm text-muted-foreground">User Agent</div>
													<div class="md:col-span-2 text-xs font-mono break-all">
														{selectedSubmission.userAgent}
													</div>
												</div>
											{/if}

											{#if selectedSubmission.spamScore !== null && selectedSubmission.spamScore !== undefined}
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
													<div class="font-medium text-sm text-muted-foreground">Spam Score</div>
													<div class="md:col-span-2 text-sm">{selectedSubmission.spamScore}</div>
												</div>
											{/if}

											{#if selectedSubmission.spamReason}
												<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2">
													<div class="font-medium text-sm text-muted-foreground">Spam Reason</div>
													<div class="md:col-span-2 text-sm">{selectedSubmission.spamReason}</div>
												</div>
											{/if}
										</div>
									{/if}
								</Accordion.Content>
							</Accordion.Item>
						</Accordion.Root>

						<!-- Action Buttons -->
						<div class="flex items-center justify-between border-t pt-4">
							<div class="flex items-center gap-2 flex-wrap">
								{#if selectedSubmission.status === 'new' && !selectedSubmission.isArchived}
									<Button
										variant="outline"
										size="sm"
										disabled={isUpdating}
										onclick={() => updateStatus('read')}
									>
										Mark as Read
									</Button>
								{/if}

								{#if selectedSubmission.status !== 'resolved' && !selectedSubmission.isArchived}
									<Button
										variant="outline"
										size="sm"
										disabled={isUpdating}
										onclick={() => updateStatus('resolved')}
									>
										<CheckCircle2 class="mr-2 h-4 w-4" />
										Resolved
									</Button>
								{/if}

								{#if selectedSubmission.isArchived}
									<Button
										variant="outline"
										size="sm"
										disabled={isUpdating}
										onclick={() => updateStatus(undefined, undefined, undefined, undefined, true)}
									>
										<ArchiveRestore class="mr-2 h-4 w-4" />
										Unarchive
									</Button>
								{:else}
									<Button
										variant="outline"
										size="sm"
										disabled={isUpdating}
										onclick={() => updateStatus(undefined, undefined, undefined, true)}
									>
										<Archive class="mr-2 h-4 w-4" />
										Archive
									</Button>
								{/if}

								{#if selectedSubmission.isSpam}
									<Button
										variant="outline"
										size="sm"
										disabled={isUpdating}
										onclick={() => updateStatus(undefined, undefined, true)}
									>
										<ShieldCheck class="mr-2 h-4 w-4" />
										Not Spam
									</Button>
								{:else}
									<Button
										variant="outline"
										size="sm"
										disabled={isUpdating}
										onclick={() => updateStatus(undefined, true)}
									>
										<AlertOctagon class="mr-2 h-4 w-4" />
										Spam
									</Button>
								{/if}
							</div>
							<Button
								variant="destructive"
								size="sm"
								onclick={() => (deleteSubmissionDialogOpen = true)}
							>
								<Trash2 class="mr-2 h-4 w-4" />
								Delete
							</Button>
						</div>
					</div>
				{:else}
					<div class="h-full hidden lg:flex items-center justify-center text-muted-foreground">
						<div class="text-center">
							<FileText class="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>Select a submission to view</p>
							<p class="text-xs mt-1">Use arrow keys or j/k to navigate</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</Card.Root>

<!-- Delete Submission Confirmation Dialog -->
<Dialog.Root bind:open={deleteSubmissionDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Submission</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete this submission? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteSubmissionDialogOpen = false)}>Cancel</Button>
			<Button variant="destructive" onclick={confirmDeleteSubmission} disabled={deletingSubmission}>
				{deletingSubmission ? 'Deleting...' : 'Delete'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
