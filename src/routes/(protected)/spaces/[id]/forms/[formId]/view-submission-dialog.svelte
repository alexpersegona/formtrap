<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Copy, ExternalLink, Calendar, Clock, AlertOctagon, Eye, CheckCircle2, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import type { Submission } from './submissions-columns';

	interface Props {
		open: boolean;
		submission: Submission | null;
		onOpenChange: (open: boolean) => void;
		onDelete: (submission: Submission) => void;
	}

	let { open = $bindable(false), submission, onOpenChange, onDelete }: Props = $props();

	// Action state
	let isUpdating = $state(false);
	let currentAction = $state<{ status?: string; isSpam?: boolean; notSpam?: boolean }>({});

	// Form refs
	let updateStatusForm: HTMLFormElement;

	const handleUpdateSubmit: SubmitFunction = () => {
		isUpdating = true;
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Submission updated successfully');
				await invalidateAll();
				await update();
				// Don't clear optimistic state here - let the effect handle it
			} else if (result.type === 'failure') {
				toast.error('Failed to update submission');
				// Revert optimistic update on failure
				optimisticStatus = null;
			}
			isUpdating = false;
		};
	};

	// Clear optimistic status when submission data catches up
	$effect(() => {
		if (!submission || !optimisticStatus) return;

		// Check if server data matches our optimistic update
		const serverMatches =
			(optimisticStatus.isSpam !== undefined && submission.isSpam === optimisticStatus.isSpam) &&
			(!optimisticStatus.status || submission.status === optimisticStatus.status);

		if (serverMatches) {
			optimisticStatus = null;
		}
	});

	async function updateStatus(status?: string, isSpam?: boolean, notSpam?: boolean) {
		if (!submission) return;

		// Set optimistic status for immediate UI update
		if (notSpam) {
			optimisticStatus = { isSpam: false, status: 'new' };
		} else if (isSpam) {
			optimisticStatus = { isSpam: true };
		} else if (status) {
			optimisticStatus = { isSpam: false, status };
		}

		currentAction = { status, isSpam, notSpam };
		await tick();
		updateStatusForm.requestSubmit();
	}

	function handleDelete() {
		if (submission) {
			open = false;
			onDelete(submission);
		}
	}

	// Parse submission data
	let parsedData = $derived(
		submission?.data ? (typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data) : {}
	);

	// Parse files data if it exists
	let parsedFiles = $derived(
		submission && 'files' in submission && submission.files
			? (typeof submission.files === 'string' ? JSON.parse(submission.files) : submission.files)
			: []
	);

	// Track if accordion is open for lazy loading
	let metadataOpen = $state(false);

	// Track optimistic status for immediate UI update
	let optimisticStatus = $state<{ status?: string; isSpam?: boolean } | null>(null);

	// Derive status badge from submission (with optimistic updates)
	let statusBadge = $derived.by(() => {
		if (!submission) return { variant: 'default' as const, label: 'New', class: 'bg-blue-100 text-blue-800' };

		// Use optimistic status if available
		const isSpam = optimisticStatus?.isSpam !== undefined ? optimisticStatus.isSpam : submission.isSpam;
		const status = optimisticStatus?.status || submission.status;

		if (isSpam) {
			return { variant: 'destructive' as const, label: 'Spam' };
		}
		if (status === 'resolved') {
			return { variant: 'default' as const, label: 'Resolved', class: 'bg-green-100 text-green-800' };
		}
		if (status === 'read') {
			return { variant: 'secondary' as const, label: 'Read' };
		}
		return { variant: 'default' as const, label: 'New', class: 'bg-blue-100 text-blue-800' };
	});

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	}
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay class="backdrop-blur-sm" />
		<Dialog.Content class="max-w-3xl max-h-[90vh] overflow-y-auto">
		{#if submission}
			<Dialog.Header>
				<Dialog.Title class="text-xl">Submission Details</Dialog.Title>
				<Dialog.Description class="mt-1 space-y-2">
					<div class="text-sm">{submission.email || 'No email provided'}</div>
					<div>
						<Badge variant={statusBadge.variant} class={statusBadge.class || ''}>
							{statusBadge.label}
						</Badge>
					</div>
				</Dialog.Description>
			</Dialog.Header>

			<div class="mt-6 space-y-6">
				<!-- Main Submission Data -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Form Data</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each Object.entries(parsedData) as [fieldName, fieldValue]}
								<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b last:border-0">
									<div class="font-medium text-sm text-muted-foreground capitalize">
										{fieldName.replace(/_/g, ' ')}
									</div>
									<div class="md:col-span-2 text-sm break-words">
										{fieldValue || '-'}
									</div>
								</div>
							{/each}

							{#if Object.keys(parsedData).length === 0}
								<p class="text-sm text-muted-foreground">No form data available</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- File Uploads -->
				{#if parsedFiles.length > 0}
					<Card.Root>
						<Card.Header>
							<Card.Title>File Uploads</Card.Title>
						</Card.Header>
						<Card.Content>
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
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Metadata Accordion -->
				<Accordion.Root bind:value={metadataOpen} type="single" collapsible>
					<Accordion.Item value="metadata">
						<Accordion.Trigger class="text-sm font-medium">
							Technical Metadata
						</Accordion.Trigger>
						<Accordion.Content>
							{#if metadataOpen}
								<div class="space-y-3 pt-2">
									<!-- Timestamps -->
									<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
										<div class="font-medium text-sm text-muted-foreground flex items-center gap-1">
											<Calendar class="h-3 w-3" />
											Submitted At
										</div>
										<div class="md:col-span-2 text-sm">
											{format(new Date(submission.createdAt), 'PPpp')}
										</div>
									</div>

									{#if submission.updatedAt && submission.updatedAt !== submission.createdAt}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground flex items-center gap-1">
												<Clock class="h-3 w-3" />
												Updated At
											</div>
											<div class="md:col-span-2 text-sm">
												{format(new Date(submission.updatedAt), 'PPpp')}
											</div>
										</div>
									{/if}

									<!-- IP Address -->
									{#if 'ipAddress' in submission && submission.ipAddress}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												IP Address
											</div>
											<div class="md:col-span-2 text-sm font-mono">
												{submission.ipAddress}
											</div>
										</div>
									{/if}

									<!-- Device Info -->
									{#if 'device' in submission && submission.device}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Device
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.device}
											</div>
										</div>
									{/if}

									{#if 'deviceType' in submission && submission.deviceType}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Device Type
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.deviceType}
											</div>
										</div>
									{/if}

									{#if 'os' in submission && submission.os}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Operating System
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.os}
											</div>
										</div>
									{/if}

									{#if 'browser' in submission && submission.browser}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Browser
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.browser}
											</div>
										</div>
									{/if}

									<!-- User Agent -->
									{#if 'userAgent' in submission && submission.userAgent}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												User Agent
											</div>
											<div class="md:col-span-2 text-xs font-mono break-all">
												{submission.userAgent}
											</div>
										</div>
									{/if}

									<!-- Referer -->
									{#if 'referer' in submission && submission.referer}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Referer
											</div>
											<div class="md:col-span-2 text-sm break-all">
												{submission.referer}
											</div>
										</div>
									{/if}

									<!-- Bot Detection -->
									{#if 'isRobot' in submission}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Bot Detected
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.isRobot ? 'Yes' : 'No'}
											</div>
										</div>
									{/if}

									<!-- Spam Info -->
									{#if 'spamScore' in submission && submission.spamScore !== null}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Spam Score
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.spamScore}
											</div>
										</div>
									{/if}

									{#if 'spamReason' in submission && submission.spamReason}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Spam Reason
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.spamReason}
											</div>
										</div>
									{/if}

									<!-- Notification Status -->
									{#if 'webhookSent' in submission}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
											<div class="font-medium text-sm text-muted-foreground">
												Webhook Sent
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.webhookSent ? 'Yes' : 'No'}
												{#if submission.webhookSent && 'webhookSentAt' in submission && submission.webhookSentAt}
													<span class="text-xs text-muted-foreground ml-2">
														({format(new Date(submission.webhookSentAt), 'PPp')})
													</span>
												{/if}
											</div>
										</div>
									{/if}

									{#if 'emailSent' in submission}
										<div class="grid grid-cols-1 md:grid-cols-3 gap-2 py-2">
											<div class="font-medium text-sm text-muted-foreground">
												Email Sent
											</div>
											<div class="md:col-span-2 text-sm">
												{submission.emailSent ? 'Yes' : 'No'}
												{#if submission.emailSent && 'emailSentAt' in submission && submission.emailSentAt}
													<span class="text-xs text-muted-foreground ml-2">
														({format(new Date(submission.emailSentAt), 'PPp')})
													</span>
												{/if}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>

				<!-- Action Buttons Footer -->
				<div class="flex items-center justify-between border-t pt-4">
					<div class="flex items-center gap-2">
						{#if optimisticStatus?.isSpam !== undefined ? optimisticStatus.isSpam : submission.isSpam}
							<Button
								variant="outline"
								size="sm"
								disabled={isUpdating}
								onclick={() => updateStatus(undefined, undefined, true)}
							>
								<CheckCircle2 class="mr-2 h-4 w-4" />
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
							<Button
								variant="outline"
								size="sm"
								disabled={isUpdating}
								onclick={() => updateStatus('read')}
							>
								<Eye class="mr-2 h-4 w-4" />
								Read
							</Button>
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
					</div>
					<Button
						variant="destructive"
						size="sm"
						disabled={isUpdating}
						onclick={handleDelete}
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					</Button>
				</div>

				<!-- Hidden Form for Status Updates -->
				<form bind:this={updateStatusForm} method="POST" action="?/bulkUpdateStatus" use:enhance={handleUpdateSubmit} class="hidden">
					<input type="hidden" name="submissionIds" value={JSON.stringify([submission?.id])} />
					<input type="hidden" name="status" value={currentAction.status || ''} />
					<input type="hidden" name="isSpam" value={currentAction.isSpam ? 'true' : ''} />
					<input type="hidden" name="notSpam" value={currentAction.notSpam ? 'true' : ''} />
				</form>
			</div>
		{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
