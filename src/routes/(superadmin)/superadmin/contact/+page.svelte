<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import { page } from '$app/stores';
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import InboxFilters from '$lib/components/inbox-filters.svelte';
	import { toast } from 'svelte-sonner';
	import type { SubmitFunction } from '@sveltejs/kit';
		import {
		Mail,
		MailOpen,
		Archive,
		ArchiveRestore,
		Trash2,
		Clock,
		ChevronRight,
		ChevronLeft,
		ArrowUpDown,
		ShieldAlert,
		ShieldCheck
	} from '@lucide/svelte';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedId = $state<string | null>(null);
	let deleteDialogOpen = $state(false);
	let deleteId = $state<string | null>(null);
	let mobileDetailOpen = $state(false);
	let isUpdating = $state(false);

	// Virtualization
	let listContainer: HTMLDivElement;

	// Infinite scroll state
	let allSubmissions = $state([...data.submissions]);
	let currentPage = $state(1);
	let isLoadingMore = $state(false);
	let hasMore = $derived(allSubmissions.length < data.pagination.totalCount);

	// Reset submissions when data changes (filter change, etc.)
	$effect(() => {
		allSubmissions = [...data.submissions];
		currentPage = 1;
		// Immediately update virtualizer count to prevent stale index access
		$virtualizer.setOptions({ count: data.submissions.length });
	});

	// Date range state
	interface DateRange {
		start: DateValue | undefined;
		end: DateValue | undefined;
	}

	// Initialize date range from server data
	function parseDateToCalendarDate(dateStr: string | null): DateValue | undefined {
		if (!dateStr) return undefined;
		const date = new Date(dateStr);
		return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
	}

	let dateRange = $state<DateRange>({
		start: parseDateToCalendarDate(data.dateRange.from),
		end: parseDateToCalendarDate(data.dateRange.to)
	});

	// Bulk selection
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

	async function bulkArchive() {
		if (selectedIds.size === 0) return;
		isUpdating = true;
		const count = selectedIds.size;
		try {
			for (const id of selectedIds) {
				const formData = new FormData();
				formData.append('id', id);
				await fetch('?/archive', { method: 'POST', body: formData });
			}
			await invalidateAll();
			selectedIds = new Set();
			toast.success(`Archived ${count} messages`);
		} catch {
			toast.error('Failed to archive messages');
		} finally {
			isUpdating = false;
		}
	}

	async function bulkDelete() {
		if (selectedIds.size === 0) return;
		isUpdating = true;
		const count = selectedIds.size;
		try {
			for (const id of selectedIds) {
				const formData = new FormData();
				formData.append('id', id);
				await fetch('?/delete', { method: 'POST', body: formData });
			}
			await invalidateAll();
			selectedIds = new Set();
			if (selectedId && selectedIds.has(selectedId)) {
				selectedId = null;
			}
			toast.success(`Deleted ${count} messages`);
		} catch {
			toast.error('Failed to delete messages');
		} finally {
			isUpdating = false;
		}
	}

	async function bulkMarkRead() {
		if (selectedIds.size === 0) return;
		isUpdating = true;
		try {
			for (const id of selectedIds) {
				const formData = new FormData();
				formData.append('id', id);
				await fetch('?/markAsRead', { method: 'POST', body: formData });
			}
			await invalidateAll();
			selectedIds = new Set();
			toast.success('Marked as read');
		} catch {
			toast.error('Failed to mark as read');
		} finally {
			isUpdating = false;
		}
	}

	async function bulkMarkAsSpam() {
		if (selectedIds.size === 0) return;
		isUpdating = true;
		const count = selectedIds.size;
		try {
			for (const id of selectedIds) {
				const formData = new FormData();
				formData.append('id', id);
				formData.append('reason', 'Manually marked as spam');
				await fetch('?/markAsSpam', { method: 'POST', body: formData });
			}
			await invalidateAll();
			selectedIds = new Set();
			toast.success(`Marked ${count} messages as spam`);
		} catch {
			toast.error('Failed to mark as spam');
		} finally {
			isUpdating = false;
		}
	}

	async function bulkMarkAsNotSpam() {
		if (selectedIds.size === 0) return;
		isUpdating = true;
		const count = selectedIds.size;
		try {
			for (const id of selectedIds) {
				const formData = new FormData();
				formData.append('id', id);
				await fetch('?/markAsNotSpam', { method: 'POST', body: formData });
			}
			await invalidateAll();
			selectedIds = new Set();
			toast.success(`Marked ${count} messages as not spam`);
		} catch {
			toast.error('Failed to mark as not spam');
		} finally {
			isUpdating = false;
		}
	}

	// Sort options
	type SortOption = 'newest' | 'oldest';
	let sortBy = $state<SortOption>('newest');

	// Sorted submissions (uses allSubmissions for infinite scroll)
	const sortedSubmissions = $derived(() => {
		const sorted = [...allSubmissions];
		if (sortBy === 'oldest') {
			sorted.sort((a, b) => a.createdAtMs - b.createdAtMs);
		} else {
			sorted.sort((a, b) => b.createdAtMs - a.createdAtMs);
		}
		return sorted;
	});

	// Virtualizer for list
	const virtualizer = createVirtualizer({
		count: sortedSubmissions().length,
		getScrollElement: () => listContainer,
		estimateSize: () => 88, // Estimated row height in pixels
		overscan: 5
	});

	// Update virtualizer when count changes
	$effect(() => {
		$virtualizer.setOptions({ count: sortedSubmissions().length });
	});

	// Infinite scroll: load more when near bottom
	async function loadMoreSubmissions() {
		if (isLoadingMore || !hasMore) return;

		isLoadingMore = true;
		const nextPage = currentPage + 1;

		try {
			const params = new URLSearchParams($page.url.searchParams);
			params.set('page', nextPage.toString());

			const response = await fetch(`/superadmin/contact/api?${params}`);
			if (!response.ok) throw new Error('Failed to fetch');

			const result = await response.json();
			if (result.submissions && result.submissions.length > 0) {
				allSubmissions = [...allSubmissions, ...result.submissions];
				currentPage = nextPage;
			}
		} catch (err) {
			console.error('Failed to load more submissions:', err);
		} finally {
			isLoadingMore = false;
		}
	}

	// Watch for scroll near bottom
	$effect(() => {
		const virtualItems = $virtualizer.getVirtualItems();
		if (virtualItems.length === 0) return;

		const lastItem = virtualItems[virtualItems.length - 1];
		// Load more when within 10 items of the end
		if (lastItem && lastItem.index >= sortedSubmissions().length - 10 && hasMore && !isLoadingMore) {
			loadMoreSubmissions();
		}
	});

	const selectedSubmission = $derived(allSubmissions.find((s) => s.id === selectedId));
	const selectedIndex = $derived(sortedSubmissions().findIndex((s) => s.id === selectedId));

	function formatDate(ms: number) {
		return new Date(ms).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function timeAgo(ms: number) {
		const now = Date.now();
		const diffMs = now - ms;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return formatDate(ms);
	}

	function setFilter(filter: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.delete('page'); // Reset pagination on filter change
		if (filter === 'all') {
			params.delete('filter');
		} else {
			params.set('filter', filter);
		}
		goto(`?${params.toString()}`);
		selectedId = null;
	}

	function handleDateRangeChange(range: DateRange) {
		dateRange = range;
		const params = new URLSearchParams($page.url.searchParams);
		params.delete('page'); // Reset pagination on date change

		if (range.start) {
			const startDate = new Date(range.start.year, range.start.month - 1, range.start.day);
			params.set('dateFrom', startDate.toISOString().split('T')[0]);
		} else {
			params.delete('dateFrom');
		}

		if (range.end) {
			const endDate = new Date(range.end.year, range.end.month - 1, range.end.day);
			params.set('dateTo', endDate.toISOString().split('T')[0]);
		} else {
			params.delete('dateTo');
		}

		goto(`?${params.toString()}`);
	}

	const handleAction: SubmitFunction = () => {
		return async ({ result }) => {
			if (result.type === 'success') {
				await invalidateAll();
				// If we deleted the selected one, clear selection
				if (deleteId === selectedId) {
					selectedId = null;
					mobileDetailOpen = false;
				}
				deleteDialogOpen = false;
				deleteId = null;
			} else if (result.type === 'failure') {
				toast.error(result.data?.error || 'Action failed');
			}
		};
	};

	function confirmDelete(id: string) {
		deleteId = id;
		deleteDialogOpen = true;
	}

	// Auto-mark as read when selecting
	function selectSubmission(id: string, shouldScrollIntoView = false) {
		selectedId = id;
		mobileDetailOpen = true;
		const submission = data.submissions.find((s) => s.id === id);
		if (submission && !submission.isRead) {
			// Submit the mark as read form programmatically
			const form = document.getElementById(`mark-read-${id}`) as HTMLFormElement;
			if (form) {
				form.requestSubmit();
			}
		}

		// Scroll the selected item into view if requested (keyboard navigation)
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
			// Blur any focused element to remove focus outline from clicked items
			(document.activeElement as HTMLElement)?.blur();
			const currentIndex = selectedIndex;
			const nextIndex = currentIndex < sortedSubmissions().length - 1 ? currentIndex + 1 : 0;
			selectSubmission(sortedSubmissions()[nextIndex].id, true);
		} else if (event.key === 'ArrowUp' || event.key === 'k') {
			event.preventDefault();
			// Blur any focused element to remove focus outline from clicked items
			(document.activeElement as HTMLElement)?.blur();
			const currentIndex = selectedIndex;
			const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedSubmissions().length - 1;
			selectSubmission(sortedSubmissions()[prevIndex].id, true);
		} else if (event.key === 'Escape' && mobileDetailOpen) {
			event.preventDefault();
			closeMobileDetail();
		}
	}

	// Select first submission on load if none selected
	$effect(() => {
		if (sortedSubmissions().length > 0 && !selectedId) {
			selectedId = sortedSubmissions()[0].id;
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Contact Inbox</h1>
		<p class="text-muted-foreground">Messages from the website contact form</p>
	</div>

	<!-- Filter Section -->
	<div class="flex items-center justify-between">
		<InboxFilters
			filter={data.filter}
			counts={data.counts}
			bind:dateRange
			onFilterChange={setFilter}
			onDateRangeChange={handleDateRangeChange}
		/>
	</div>

	<!-- Content -->
	<Card class="overflow-hidden p-0">
		<div class="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-340px)] min-h-[500px]">
			<!-- Message List -->
			<div class="lg:col-span-1 lg:border-r overflow-hidden flex flex-col {mobileDetailOpen ? 'hidden lg:flex' : ''}">
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
							{data.pagination.totalCount} {data.pagination.totalCount === 1 ? 'message' : 'messages'}
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
							{#if data.filter === 'spam'}
								<Button variant="ghost" size="sm" onclick={bulkMarkAsNotSpam} disabled={isUpdating} title="Not spam">
									<ShieldCheck class="h-4 w-4" />
								</Button>
							{:else if data.filter !== 'archived'}
								<Button variant="ghost" size="sm" onclick={bulkMarkRead} disabled={isUpdating} title="Mark as read">
									<MailOpen class="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="sm" onclick={bulkArchive} disabled={isUpdating} title="Archive">
									<Archive class="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="sm" onclick={bulkMarkAsSpam} disabled={isUpdating} title="Mark as spam">
									<ShieldAlert class="h-4 w-4" />
								</Button>
							{/if}
							<Button variant="ghost" size="sm" onclick={bulkDelete} disabled={isUpdating} class="text-destructive hover:text-destructive" title="Delete">
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/if}

				<!-- Message List -->
				<div
					bind:this={listContainer}
					class="flex-1 min-h-0 overflow-y-auto scroll-shadows"
				>
					{#if sortedSubmissions().length === 0}
						<div class="p-8 text-center text-muted-foreground">
							{#if data.filter === 'spam'}
								<ShieldAlert class="h-12 w-12 mx-auto mb-4 opacity-50" />
								<p>No spam messages</p>
							{:else}
								<Mail class="h-12 w-12 mx-auto mb-4 opacity-50" />
								<p>No messages {data.filter === 'unread' ? 'unread' : data.filter === 'archived' ? 'archived' : ''}</p>
							{/if}
						</div>
					{:else}
						<div style="height: {$virtualizer.getTotalSize()}px; width: 100%; position: relative;">
							{#each $virtualizer.getVirtualItems() as row (row.key)}
								{@const submission = sortedSubmissions()[row.index]}
								{#if submission}
								<!-- Hidden form for mark as read -->
								<form
									id="mark-read-{submission.id}"
									method="POST"
									action="?/markAsRead"
									use:enhance={handleAction}
									class="hidden"
								>
									<input type="hidden" name="id" value={submission.id} />
								</form>

								<div
									data-submission-id={submission.id}
									style="position: absolute; top: 0; left: 0; width: 100%; height: {row.size}px; transform: translateY({row.start}px);"
									class="text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-start gap-3 border-b
										{selectedId === submission.id ? 'bg-accent' : ''}
										{!submission.isRead && !submission.isSpam ? 'bg-blue-500/5' : ''}
										{submission.isSpam ? 'bg-destructive/5' : ''}"
								>
									<Checkbox
										checked={selectedIds.has(submission.id)}
										onCheckedChange={() => toggleSelect(submission.id)}
										aria-label="Select message"
										class="mt-0.5"
										onclick={(e: MouseEvent) => e.stopPropagation()}
									/>
									<button
										onclick={() => selectSubmission(submission.id)}
										class="flex-1 text-left min-w-0 focus:outline-none"
									>
										<div class="flex items-start gap-3">
											<div class="flex-shrink-0 mt-0.5">
												{#if submission.isSpam}
													<ShieldAlert class="h-4 w-4 text-destructive" />
												{:else if submission.isRead}
													<MailOpen class="h-4 w-4 text-muted-foreground" />
												{:else}
													<Mail class="h-4 w-4 text-blue-500" />
												{/if}
											</div>
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2">
													<p class="flex-1 min-w-0 font-medium truncate {!submission.isRead ? 'text-foreground' : ''} {submission.isSpam ? 'text-destructive' : ''}">
														{submission.name}
													</p>
													<span class="text-xs text-muted-foreground flex-shrink-0">
														{timeAgo(submission.createdAtMs)}
													</span>
												</div>
												<p class="text-sm text-muted-foreground truncate">{submission.subject}</p>
												{#if submission.isSpam && submission.spamReason}
													<p class="text-xs text-destructive truncate mt-0.5">
														Spam: {submission.spamReason}
													</p>
												{:else}
													<p class="text-xs text-muted-foreground truncate mt-0.5">
														{submission.message.slice(0, 60)}...
													</p>
												{/if}
											</div>
											{#if selectedId === submission.id}
												<ChevronRight class="h-4 w-4 text-muted-foreground flex-shrink-0 hidden lg:block" />
											{/if}
										</div>
									</button>
								</div>
								{/if}
							{/each}
						</div>
					{/if}
					{#if isLoadingMore}
						<div class="flex items-center justify-center py-4 text-sm text-muted-foreground">
							<div class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2"></div>
							Loading more...
						</div>
					{/if}
				</div>
			</div>

			<!-- Message Detail -->
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
							<div class="flex items-center gap-2">
								<h2 class="text-xl font-semibold">{selectedSubmission.subject}</h2>
								{#if selectedSubmission.isSpam}
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
										<ShieldAlert class="h-3 w-3" />
										Spam
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
								<span class="font-medium text-foreground">{selectedSubmission.name}</span>
								<span>&lt;{selectedSubmission.email}&gt;</span>
							</div>
							<div class="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
								<Clock class="h-3 w-3" />
								<span>{formatDate(selectedSubmission.createdAtMs)}</span>
								{#if selectedSubmission.ipAddress}
									<span class="mx-1">·</span>
									<span>IP: {selectedSubmission.ipAddress}</span>
								{/if}
							</div>
							{#if selectedSubmission.isSpam && selectedSubmission.spamReason}
								<div class="flex items-center gap-1 mt-2 text-xs text-destructive">
									<span>Spam reason: {selectedSubmission.spamReason}</span>
								</div>
							{/if}
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-2">
							{#if selectedSubmission.isRead && !selectedSubmission.isSpam}
								<form method="POST" action="?/markAsUnread" use:enhance={handleAction}>
									<input type="hidden" name="id" value={selectedSubmission.id} />
									<Button variant="ghost" size="sm" type="submit" title="Mark as unread">
										<Mail class="h-4 w-4" />
									</Button>
								</form>
							{/if}

							{#if selectedSubmission.isSpam}
								<form method="POST" action="?/markAsNotSpam" use:enhance={handleAction}>
									<input type="hidden" name="id" value={selectedSubmission.id} />
									<Button variant="ghost" size="sm" type="submit" title="Not spam">
										<ShieldCheck class="h-4 w-4" />
									</Button>
								</form>
							{:else}
								<form method="POST" action="?/markAsSpam" use:enhance={handleAction}>
									<input type="hidden" name="id" value={selectedSubmission.id} />
									<input type="hidden" name="reason" value="Manually marked as spam" />
									<Button variant="ghost" size="sm" type="submit" title="Mark as spam">
										<ShieldAlert class="h-4 w-4" />
									</Button>
								</form>
							{/if}

							{#if selectedSubmission.isArchived}
								<form method="POST" action="?/unarchive" use:enhance={handleAction}>
									<input type="hidden" name="id" value={selectedSubmission.id} />
									<Button variant="ghost" size="sm" type="submit" title="Unarchive">
										<ArchiveRestore class="h-4 w-4" />
									</Button>
								</form>
							{:else if !selectedSubmission.isSpam}
								<form method="POST" action="?/archive" use:enhance={handleAction}>
									<input type="hidden" name="id" value={selectedSubmission.id} />
									<Button variant="ghost" size="sm" type="submit" title="Archive">
										<Archive class="h-4 w-4" />
									</Button>
								</form>
							{/if}

							<Button
								variant="ghost"
								size="sm"
								onclick={() => confirmDelete(selectedSubmission.id)}
								title="Delete"
								class="text-destructive hover:text-destructive"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>

					<!-- Message Content -->
					<div class="border-t pt-6">
						<p class="whitespace-pre-wrap">{selectedSubmission.message}</p>
					</div>

					<!-- Reply Button -->
					<div class="border-t pt-6">
						<a href="mailto:{selectedSubmission.email}?subject=Re: {selectedSubmission.subject}">
							<Button>Reply via Email</Button>
						</a>
					</div>
				</div>
			{:else}
				<div class="h-full hidden lg:flex items-center justify-center text-muted-foreground">
					<div class="text-center">
						<Mail class="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p>Select a message to view</p>
						<p class="text-xs mt-1">Use arrow keys or j/k to navigate</p>
					</div>
				</div>
			{/if}
			</div>
		</div>
	</Card>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Message</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete this message? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
			<form method="POST" action="?/delete" use:enhance={handleAction}>
				<input type="hidden" name="id" value={deleteId} />
				<Button variant="destructive" type="submit">Delete</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
