<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PageIntro from '$lib/components/page-intro.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import {
		Search,
		ArrowUpDown,
		ArrowUp,
		ArrowDown,
		ExternalLink,
		FileText,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchInput = $state(data.search);
	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const params = new URLSearchParams($page.url.searchParams);
			if (searchInput) {
				params.set('search', searchInput);
			} else {
				params.delete('search');
			}
			params.delete('page'); // Reset to page 1 on search
			goto(`?${params.toString()}`, { replaceState: true });
		}, 300);
	}

	function toggleSort(column: string) {
		const params = new URLSearchParams($page.url.searchParams);
		const currentSortBy = params.get('sortBy') || 'form';
		const currentSortOrder = params.get('sortOrder') || 'asc';

		if (currentSortBy === column) {
			// Toggle direction
			params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
		} else {
			// New column, default to ascending
			params.set('sortBy', column);
			params.set('sortOrder', 'asc');
		}
		goto(`?${params.toString()}`, { replaceState: true });
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}

	function setLimit(value: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('limit', value);
		params.delete('page'); // Reset to page 1
		goto(`?${params.toString()}`);
	}
</script>

<PageIntro title="Forms" description="All forms across your spaces" />

<div class="space-y-6">
	<!-- Search -->
	<div class="flex items-center gap-4">
		<div class="relative flex-1 max-w-sm">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="search"
				placeholder="Search forms..."
				class="pl-10"
				bind:value={searchInput}
				oninput={handleSearch}
			/>
		</div>
	</div>

	<!-- Forms Table -->
	<div class="overflow-x-auto rounded-md border bg-card [&_th:first-child]:pl-5 [&_th:last-child]:pr-3 [&_td:first-child]:pl-5 [&_td:last-child]:pr-3">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>
						<Button
							variant="ghost"
							onclick={() => toggleSort('space')}
							class="-ml-4 h-8 flex items-center gap-1"
						>
							Space
							{#if data.sortBy === 'space'}
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
					<Table.Head>
						<Button
							variant="ghost"
							onclick={() => toggleSort('form')}
							class="-ml-4 h-8 flex items-center gap-1"
						>
							Form
							{#if data.sortBy === 'form'}
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
					<Table.Head class="text-center">
						<Button
							variant="ghost"
							onclick={() => toggleSort('submissions')}
							class="h-8 flex items-center gap-1 mx-auto"
						>
							Total Submissions
							{#if data.sortBy === 'submissions'}
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
					<Table.Head class="w-[100px]">Action</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.forms as formItem}
					<Table.Row class="hover:bg-muted/50">
						<Table.Cell>
							<a
								href="/spaces/{formItem.organizationId}"
								class="text-sm hover:underline text-muted-foreground hover:text-foreground"
							>
								{formItem.spaceName || 'Unknown'}
							</a>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-3">
								<div
									class="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0"
								>
									<FileText class="h-4 w-4 text-primary" />
								</div>
								<div>
									<p class="font-medium">{formItem.name}</p>
									{#if !formItem.isActive}
										<span class="text-xs text-muted-foreground">(Inactive)</span>
									{/if}
								</div>
							</div>
						</Table.Cell>
						<Table.Cell class="text-center">
							<span class="tabular-nums">{formItem.submissionCount}</span>
						</Table.Cell>
						<Table.Cell>
							<a href="/spaces/{formItem.organizationId}/forms/{formItem.id}">
								<Button variant="ghost" size="sm">
									<ExternalLink class="h-4 w-4 mr-1" />
									View
								</Button>
							</a>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={4} class="text-center py-12 text-muted-foreground">
							{#if data.search}
								<p>No forms found matching "{data.search}"</p>
								<Button
									variant="link"
									class="mt-2"
									onclick={() => {
										searchInput = '';
										goto($page.url.pathname);
									}}
								>
									Clear search
								</Button>
							{:else}
								<div class="flex flex-col items-center gap-2">
									<FileText class="h-10 w-10 text-muted-foreground/50" />
									<p>No forms yet</p>
									<p class="text-sm">Create a form in one of your spaces to get started.</p>
								</div>
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1 || data.pagination.totalForms > 10}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<p class="text-sm text-muted-foreground">
					Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to {Math.min(
						data.pagination.page * data.pagination.limit,
						data.pagination.totalForms
					)} of {data.pagination.totalForms} forms
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
