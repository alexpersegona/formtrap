<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		FileText,
		Calendar,
		User,
		Edit,
		Trash2,
		Copy,
		CheckCircle2,
		Link as LinkIcon,
		ShieldAlert,
		Download,
		FileSpreadsheet,
		FileType
	} from 'lucide-svelte';
	import { formatDistanceToNow, format } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import { PUBLIC_SUBMISSION_ENDPOINT } from '$env/static/public';
	import SubmissionsDataTable from './submissions-data-table.svelte';
	import { columns, spamColumns } from './submissions-columns';

	let { data }: { data: PageData } = $props();

	let deleteDialogOpen = $state(false);
	let deleting = $state(false);

	// Tab state from URL
	let activeTab = $derived(data.activeTab);

	// Update URL when tab changes
	function handleTabChange(value: string | undefined) {
		if (!value) return;

		const url = new URL($page.url);
		// Reset pagination when switching tabs
		url.searchParams.delete('page');

		if (value === 'submissions') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', value);
		}
		goto(url.toString(), { replaceState: true, keepFocus: true });
	}

	const handleDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ update }) => {
			deleting = false;
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
		} catch (err) {
			toast.error('Failed to copy to clipboard');
		}
	}

	// Export functionality
	let exportForm: HTMLFormElement;
	let exportFormat = $state<'csv' | 'txt'>('csv');
	let exporting = $state(false);

	const handleExport: SubmitFunction = () => {
		exporting = true;
		return async ({ result, update }) => {
			exporting = false;
			if (result.type === 'success' && result.data?.success) {
				const submissions = result.data.submissions as Array<{
					id: string;
					name: string | null;
					email: string | null;
					status: string;
					isSpam: boolean;
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
		// Get all unique keys from data fields
		const dataKeys = new Set<string>();
		submissions.forEach((s) => {
			if (s.data && typeof s.data === 'object') {
				Object.keys(s.data as Record<string, unknown>).forEach((key) => dataKeys.add(key));
			}
		});

		// Build headers
		const headers = ['ID', 'Name', 'Email', 'Status', 'Is Spam', 'Created At', 'IP Address', 'Device', 'Browser', 'OS', 'Files', ...Array.from(dataKeys)];

		// Build rows
		const rows = submissions.map((s) => {
			const dataObj = (s.data || {}) as Record<string, unknown>;
			const filesArray = s.files as Array<{ name: string; url?: string; path?: string }> | null;
			const filesStr = filesArray && filesArray.length > 0
				? filesArray.map((f) => `${f.name} (${f.url || f.path || ''})`).join('; ')
				: '';
			const row = [
				s.id,
				s.name || '',
				s.email || '',
				s.status,
				s.isSpam ? 'Yes' : 'No',
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
			const filesLines = filesArray && filesArray.length > 0
				? filesArray.map((f) => `  - ${f.name}: ${f.url || f.path || '(no URL)'}`).join('\n')
				: '  (no files)';

			return `--- Submission ${index + 1} ---
ID: ${s.id}
Name: ${s.name || '(not provided)'}
Email: ${s.email || '(not provided)'}
Status: ${s.status}
Is Spam: ${s.isSpam ? 'Yes' : 'No'}
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
</script>

<svelte:head>
	<title>{data.form.name} - {data.space.name}</title>
</svelte:head>

<!-- Hidden Export Form -->
<form
	bind:this={exportForm}
	method="POST"
	action="?/exportSubmissions"
	use:enhance={handleExport}
	class="hidden"
>
	<input type="hidden" name="format" value={exportFormat} />
	<input type="hidden" name="includeSpam" value="false" />
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

			<Dialog.Root bind:open={deleteDialogOpen}>
				<Dialog.Trigger>
					<Button variant="destructive">
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Delete Form</Dialog.Title>
						<Dialog.Description>
							Are you sure you want to delete "{data.form.name}"? This action cannot be undone. All
							submissions will also be permanently deleted.
						</Dialog.Description>
					</Dialog.Header>
					<form method="POST" action="?/delete" use:enhance={handleDelete} class="space-y-4">
						<Dialog.Footer>
							<Button type="button" variant="outline" onclick={() => (deleteDialogOpen = false)}>
								Cancel
							</Button>
							<Button type="submit" variant="destructive" disabled={deleting}>
								{deleting ? 'Deleting...' : 'Delete Form'}
							</Button>
						</Dialog.Footer>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</div>
</div>

<!-- Submissions Tabs -->
<Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
	<Tabs.List variant="important" class="mb-6">
		<Tabs.Trigger value="submissions">
			<FileText class="mr-2 h-4 w-4" />
			Submissions
			<Badge variant="secondary" class="ml-2">{data.submissionsCount}</Badge>
		</Tabs.Trigger>
		<Tabs.Trigger value="spam">
			<ShieldAlert class="mr-2 h-4 w-4" />
			Spam
			{#if data.spamCount > 0}
				<Badge variant="destructive" class="ml-2">{data.spamCount}</Badge>
			{/if}
		</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="submissions">
		<Card.Root>
			<Card.Header class="flex flex-row items-start justify-between">
				<div>
					<Card.Title class="flex items-center gap-2">
						<FileText class="h-5 w-5" />
						Submissions
						<Badge variant="secondary">{data.submissionsCount}</Badge>
					</Card.Title>
					<Card.Description>Form submissions will appear here</Card.Description>
				</div>
				{#if data.submissionsCount > 0}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="outline" size="sm" disabled={exporting}>
									<Download class="mr-2 h-4 w-4" />
									{exporting ? 'Exporting...' : 'Download'}
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
			</Card.Header>
			<Card.Content>
				{#if data.submissionsCount === 0}
					<div class="py-12 text-center text-sm text-muted-foreground">
						<FileText class="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
						<p class="font-medium">No submissions yet</p>
						<p class="mt-2">Submissions will appear here once the form starts receiving data</p>
					</div>
				{:else}
					<SubmissionsDataTable
						data={data.submissions}
						columns={columns}
						pagination={data.pagination}
						sorting={data.sorting}
					/>
				{/if}
			</Card.Content>
		</Card.Root>
	</Tabs.Content>

	<Tabs.Content value="spam">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<ShieldAlert class="h-5 w-5" />
					Spam
					<Badge variant="destructive">{data.spamCount}</Badge>
				</Card.Title>
				<Card.Description>
					Suspected spam submissions. Review and mark as not spam if incorrectly flagged.
					Spam is automatically deleted after 30 days.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.spamCount === 0}
					<div class="py-12 text-center text-sm text-muted-foreground">
						<ShieldAlert class="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
						<p class="font-medium">No spam detected</p>
						<p class="mt-2">Spam submissions will appear here when detected</p>
					</div>
				{:else}
					<SubmissionsDataTable
						data={data.submissions}
						columns={spamColumns}
						pagination={data.pagination}
						sorting={data.sorting}
						isSpamView={true}
					/>
				{/if}
			</Card.Content>
		</Card.Root>
	</Tabs.Content>
</Tabs.Root>
