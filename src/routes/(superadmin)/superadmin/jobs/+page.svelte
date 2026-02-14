<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		ListTodo,
		Clock,
		CheckCircle,
		XCircle,
		AlertTriangle,
		RefreshCw,
		Play,
		Pause,
		Trash2,
		Settings2,
		RotateCcw,
		Search,
		FileSearch,
		HardDrive
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let orphanScanLoading = $state(false);
	let orphanDryRun = $state(true);

	// Aggregate queue stats
	const queueTotals = $derived(() => {
		const totals: Record<string, Record<string, number>> = {
			critical: { available: 0, running: 0, completed: 0, failed: 0 },
			default: { available: 0, running: 0, completed: 0, failed: 0 },
			low: { available: 0, running: 0, completed: 0, failed: 0 }
		};

		for (const stat of data.queueStats) {
			const queue = stat.queue || 'default';
			const state = stat.state;
			if (totals[queue]) {
				if (state === 'available' || state === 'scheduled') {
					totals[queue].available += stat.count;
				} else if (state === 'running') {
					totals[queue].running += stat.count;
				} else if (state === 'completed') {
					totals[queue].completed += stat.count;
				} else if (['retryable', 'discarded', 'cancelled'].includes(state)) {
					totals[queue].failed += stat.count;
				}
			}
		}

		return totals;
	});

	const totalPending = $derived(
		Object.values(queueTotals()).reduce((sum, q) => sum + q.available, 0)
	);
	const totalRunning = $derived(
		Object.values(queueTotals()).reduce((sum, q) => sum + q.running, 0)
	);
	const totalFailed = $derived(
		Object.values(queueTotals()).reduce((sum, q) => sum + q.failed, 0)
	);

	function getStateColor(state: string): string {
		switch (state) {
			case 'available':
			case 'scheduled':
				return 'bg-blue-500/10 text-blue-500';
			case 'running':
				return 'bg-yellow-500/10 text-yellow-500';
			case 'completed':
				return 'bg-green-500/10 text-green-500';
			case 'retryable':
			case 'discarded':
			case 'cancelled':
				return 'bg-red-500/10 text-red-500';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	function getStateLabel(state: string): string {
		switch (state) {
			case 'available':
				return 'Pending';
			case 'scheduled':
				return 'Scheduled';
			case 'running':
				return 'Running';
			case 'completed':
				return 'Completed';
			case 'retryable':
				return 'Retryable';
			case 'discarded':
				return 'Failed';
			case 'cancelled':
				return 'Cancelled';
			default:
				return state;
		}
	}

	function formatDuration(ms: number | null): string {
		if (!ms) return '-';
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}

	function formatJobKind(kind: string): string {
		return kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function getJobIcon(kind: string) {
		if (kind.includes('delete')) return Trash2;
		if (kind.includes('retention')) return Clock;
		return ListTodo;
	}

	async function handleRefresh() {
		await invalidateAll();
		toast.success('Refreshed');
	}

	function setLimit(value: string) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('limit', value);
		params.delete('page'); // Reset to page 1
		goto(`?${params.toString()}`);
	}

	function formatBytes(bytes: number | string | null | undefined): string {
		const num = Number(bytes);
		if (!num || num === 0 || isNaN(num)) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(num) / Math.log(k));
		return parseFloat((num / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	const handleOrphanScanSubmit: SubmitFunction = () => {
		orphanScanLoading = true;
		return async ({ result, update }) => {
			orphanScanLoading = false;
			if (result.type === 'success') {
				toast.success('Orphan scan job queued');
				await update();
			} else {
				toast.error('Failed to start orphan scan');
			}
		};
	};
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Job Queue</h1>
			<p class="text-muted-foreground">Monitor and manage background jobs</p>
		</div>
		<Button variant="outline" onclick={handleRefresh}>
			<RefreshCw class="h-4 w-4 mr-2" />
			Refresh
		</Button>
	</div>

	{#if !data.riverTablesExist}
		<!-- River not initialized -->
		<Card class="p-6">
			<div class="flex items-center gap-4">
				<div class="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
					<AlertTriangle class="h-6 w-6 text-yellow-500" />
				</div>
				<div>
					<h3 class="text-lg font-semibold">Job Queue Not Initialized</h3>
					<p class="text-sm text-muted-foreground">
						River tables have not been created yet. The Go API will create them on first startup.
					</p>
				</div>
			</div>
		</Card>
	{:else}
		<!-- Queue Status Cards -->
		<div class="grid gap-4 md:grid-cols-4">
			<Card class="p-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
						<Clock class="h-5 w-5 text-blue-500" />
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Pending</p>
						<p class="text-2xl font-bold">{totalPending}</p>
					</div>
				</div>
			</Card>

			<Card class="p-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
						<Play class="h-5 w-5 text-yellow-500" />
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Running</p>
						<p class="text-2xl font-bold">{totalRunning}</p>
					</div>
				</div>
			</Card>

			<Card class="p-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
						<XCircle class="h-5 w-5 text-red-500" />
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Failed</p>
						<p class="text-2xl font-bold">{totalFailed}</p>
					</div>
				</div>
			</Card>

			<Card class="p-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
						<Settings2 class="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<p class="text-sm text-muted-foreground">24h Avg Duration</p>
						<p class="text-2xl font-bold">{formatDuration(data.metrics.avgDuration)}</p>
					</div>
				</div>
			</Card>
		</div>

		<!-- Stats Summary -->
		{#if data.metricsTableExists}
			<Card class="p-4">
				<h3 class="text-sm font-medium text-muted-foreground mb-3">Last 24 Hours</h3>
				<div class="grid grid-cols-3 gap-4 text-center">
					<div>
						<p class="text-2xl font-bold">{data.metrics.total}</p>
						<p class="text-xs text-muted-foreground">Jobs Processed</p>
					</div>
					<div>
						<p class="text-2xl font-bold">{formatDuration(data.metrics.avgDuration)}</p>
						<p class="text-xs text-muted-foreground">Avg Duration</p>
					</div>
					<div>
						<p class="text-2xl font-bold">{data.metrics.failureRate.toFixed(1)}%</p>
						<p class="text-xs text-muted-foreground">Failure Rate</p>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Provider Config -->
		<Card class="p-4">
			<h3 class="text-sm font-medium text-muted-foreground mb-3">Batch Delete Limits by Provider</h3>
			<div class="flex flex-wrap gap-3">
				{#each Object.entries(data.providerConfig) as [provider, limit]}
					<div class="px-3 py-1.5 bg-muted rounded-md text-sm">
						<span class="font-medium uppercase">{provider}</span>
						<span class="text-muted-foreground ml-2">{limit}/batch</span>
					</div>
				{/each}
			</div>
		</Card>

		<!-- Orphan Scan Section -->
		<Card class="p-4">
			<div class="flex items-center justify-between mb-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
						<FileSearch class="h-5 w-5 text-orange-500" />
					</div>
					<div>
						<h3 class="text-sm font-medium">Orphan File Scanner</h3>
						<p class="text-xs text-muted-foreground">
							Find files in storage with no matching database record
						</p>
					</div>
				</div>

				<form method="POST" action="?/triggerOrphanScan" use:enhance={handleOrphanScanSubmit}>
					<input type="hidden" name="dryRun" value={orphanDryRun.toString()} />
					<input type="hidden" name="minAgeMinutes" value="60" />
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<Checkbox id="dryRun" bind:checked={orphanDryRun} />
							<Label for="dryRun" class="text-sm">Dry run (report only)</Label>
						</div>
						<Button type="submit" variant="outline" size="sm" disabled={orphanScanLoading}>
							{#if orphanScanLoading}
								<RefreshCw class="h-4 w-4 mr-2 animate-spin" />
								Scanning...
							{:else}
								<Search class="h-4 w-4 mr-2" />
								Run Scan
							{/if}
						</Button>
					</div>
				</form>
			</div>

			{#if data.orphanScanTableExists && data.orphanScanResults.length > 0}
				<div class="border rounded-lg overflow-hidden">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Scan Date</Table.Head>
								<Table.Head>Files Scanned</Table.Head>
								<Table.Head>Orphans Found</Table.Head>
								<Table.Head>Total Size</Table.Head>
								<Table.Head>Deleted</Table.Head>
								<Table.Head>Duration</Table.Head>
								<Table.Head>Type</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.orphanScanResults as scan}
								<Table.Row>
									<Table.Cell class="text-sm">
										{new Date(scan.created_at).toLocaleString()}
									</Table.Cell>
									<Table.Cell class="font-mono">{scan.scanned_count.toLocaleString()}</Table.Cell>
									<Table.Cell>
										{#if scan.orphan_count > 0}
											<Badge variant="destructive">{scan.orphan_count}</Badge>
										{:else}
											<Badge variant="secondary">0</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="font-mono">{formatBytes(scan.total_orphan_size_bytes)}</Table.Cell>
									<Table.Cell>
										{#if scan.deleted_count !== null}
											<span class="text-green-600">{scan.deleted_count}</span>
										{:else}
											<span class="text-muted-foreground">-</span>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-muted-foreground">{formatDuration(scan.duration_ms)}</Table.Cell>
									<Table.Cell>
										{#if scan.dry_run}
											<Badge variant="outline">Dry Run</Badge>
										{:else}
											<Badge variant="default">Live</Badge>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else if data.orphanScanTableExists}
				<div class="text-center py-6 text-muted-foreground">
					<HardDrive class="h-8 w-8 mx-auto mb-2 opacity-50" />
					<p class="text-sm">No scan results yet. Run a scan to check for orphaned files.</p>
				</div>
			{:else}
				<div class="text-center py-6 text-muted-foreground">
					<AlertTriangle class="h-8 w-8 mx-auto mb-2 opacity-50" />
					<p class="text-sm">Orphan scan tables not initialized. Run the migration first.</p>
				</div>
			{/if}
		</Card>

		<!-- Filter Tabs -->
		<div class="flex items-center gap-2 border-b">
			<a
				href="?filter=all"
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {data.filter === 'all'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
			>
				All
			</a>
			<a
				href="?filter=pending"
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {data.filter === 'pending'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
			>
				Pending
			</a>
			<a
				href="?filter=running"
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {data.filter === 'running'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
			>
				Running
			</a>
			<a
				href="?filter=completed"
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {data.filter === 'completed'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
			>
				Completed
			</a>
			<a
				href="?filter=failed"
				class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {data.filter === 'failed'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
			>
				Failed
			</a>
		</div>

		<!-- Jobs Table -->
		<div class="overflow-x-auto rounded-md border bg-card [&_th:first-child]:pl-5 [&_th:last-child]:pr-3 [&_td:first-child]:pl-5 [&_td:last-child]:pr-3">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[80px]">ID</Table.Head>
						<Table.Head>Job Type</Table.Head>
						<Table.Head>Queue</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head>Completed</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.recentJobs as job}
						{@const JobIcon = getJobIcon(job.kind)}
						<Table.Row>
							<Table.Cell class="font-mono text-xs">{job.id}</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<JobIcon class="h-4 w-4 text-muted-foreground" />
									<span class="font-medium">{formatJobKind(job.kind)}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline" class="capitalize">{job.queue}</Badge>
							</Table.Cell>
							<Table.Cell>
								<Badge class={getStateColor(job.state)}>
									{getStateLabel(job.state)}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">
								{new Date(job.created_at).toLocaleString()}
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">
								{job.finalized_at ? new Date(job.finalized_at).toLocaleString() : '-'}
							</Table.Cell>
							<Table.Cell class="text-right">
								{#if ['retryable', 'discarded', 'cancelled'].includes(job.state)}
									<form method="POST" action="?/retry" use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												toast.success('Job queued for retry');
												await update();
											} else {
												toast.error('Failed to retry job');
											}
										};
									}}>
										<input type="hidden" name="jobId" value={job.id} />
										<Button variant="ghost" size="sm" type="submit">
											<RotateCcw class="h-4 w-4" />
										</Button>
									</form>
								{:else if ['available', 'scheduled'].includes(job.state)}
									<form method="POST" action="?/cancel" use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												toast.success('Job cancelled');
												await update();
											} else {
												toast.error('Failed to cancel job');
											}
										};
									}}>
										<input type="hidden" name="jobId" value={job.id} />
										<Button variant="ghost" size="sm" type="submit">
											<Pause class="h-4 w-4" />
										</Button>
									</form>
								{/if}
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={7} class="text-center py-8 text-muted-foreground">
								No jobs found
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Pagination -->
		{#if data.totalPages > 1 || data.recentJobs.length > 10}
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<span class="text-sm text-muted-foreground">Show</span>
					<Select.Root
						type="single"
						value={data.limit.toString()}
						onValueChange={(v) => v && setLimit(v)}
					>
						<Select.Trigger class="w-[70px] h-8" size="sm">
							{data.limit}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="10">10</Select.Item>
							<Select.Item value="25">25</Select.Item>
							<Select.Item value="50">50</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex items-center gap-2">
					{#if data.page > 1}
						<Button variant="outline" size="sm" href="?filter={data.filter}&limit={data.limit}&page={data.page - 1}">
							Previous
						</Button>
					{/if}
					<span class="text-sm text-muted-foreground">
						Page {data.page} of {data.totalPages}
					</span>
					{#if data.page < data.totalPages}
						<Button variant="outline" size="sm" href="?filter={data.filter}&limit={data.limit}&page={data.page + 1}">
							Next
						</Button>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
