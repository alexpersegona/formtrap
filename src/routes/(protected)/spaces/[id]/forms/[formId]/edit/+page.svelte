<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import TagInput from '$lib/components/TagInput.svelte';
	import { enhance } from '$app/forms';
	import { Loader2, User, Calendar } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { formatDistanceToNow } from 'date-fns';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Parse existing notification emails
	let existingEmails: string[] = [];
	try {
		if (data.form.notificationEmails) {
			existingEmails = JSON.parse(data.form.notificationEmails);
		}
	} catch {
		existingEmails = [];
	}

	let loading = $state(false);
	let isActive = $state(data.form.isActive);
	let allowFileUploads = $state(data.form.allowFileUploads);
	let spamCheckEnabled = $state(data.form.spamCheckEnabled);
	let sendEmailNotifications = $state(data.form.sendEmailNotifications);
	let responseType = $state(data.form.responseType);
	let notificationEmails = $state<string[]>(existingEmails);

	// Convert bytes to MB for display (default 2MB = 2097152 bytes)
	let maxFileSizeMB = $state(
		data.form.maxFileSize ? Math.round(data.form.maxFileSize / 1048576) : 2
	);

	// Convert MB to bytes for form submission
	const maxFileSizeBytes = $derived(maxFileSizeMB * 1048576);

	// Get max emails based on tier
	const maxEmails = data.subscription.tier === 'free' ? 2 : data.subscription.tier === 'pro' ? 5 : 10;

	const responseTypes = [
		{ value: 'redirect', label: 'Redirect' },
		{ value: 'json', label: 'JSON' }
	];

	const selectedResponseTypeLabel = $derived(
		responseTypes.find((r) => r.value === responseType)?.label ?? 'Select response type'
	);

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				toast.success('Form updated successfully!');
				// Apply the redirect
				await update();
			} else if (result.type === 'failure') {
				// Reset loading on failure
				loading = false;
				await update();
			} else {
				// Reset loading on other results
				loading = false;
				await update();
			}
		};
	};
</script>

<svelte:head>
	<title>Edit Form - {data.form.name} - {data.space.name}</title>
</svelte:head>

<div class="mb-6">
	<h1 class="mb-2 text-3xl font-bold">Edit Form</h1>

	<!-- Metadata -->
	<div class="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
		<div class="flex items-center gap-1.5">
			<User class="h-3.5 w-3.5" />
			<span>{data.form.createdByUser.name}</span>
		</div>
		<div class="flex items-center gap-1.5">
			<Calendar class="h-3.5 w-3.5" />
			<span>Created {formatDistanceToNow(new Date(data.form.createdAt), { addSuffix: true })}</span>
		</div>
	</div>
</div>

<!-- Error Message -->
{#if form?.error}
	<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
		<p>{form.error}</p>
	</div>
{/if}

<form method="POST" use:enhance={handleSubmit}>
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<!-- Basic Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Basic Information</Card.Title>
				<Card.Description>Give your form a name and description</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Name -->
				<div class="space-y-2">
					<Label for="name">Form Name *</Label>
					<Input
						id="name"
						name="name"
						type="text"
						placeholder="Contact Form"
						value={form?.name || data.form.name}
						required
						disabled={loading}
					/>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						name="description"
						placeholder="Describe what this form is for..."
						rows={3}
						value={data.form.description || ''}
						disabled={loading}
					/>
				</div>

				<!-- Is Active -->
				<div class="space-y-2">
					<Label for="isActive">Active</Label>
					<p class="text-muted-foreground text-sm">Form is accepting submissions</p>
					<Switch id="isActive" bind:checked={isActive} disabled={loading} />
				</div>
				<input type="hidden" name="isActive" value={isActive ? 'on' : 'off'} />
			</Card.Content>
		</Card.Root>

		<!-- File Upload Settings -->
		<Card.Root>
			<Card.Header>
				<Card.Title>File Upload Settings</Card.Title>
				<Card.Description>Configure file upload options</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Allow File Uploads -->
				<div class="space-y-2">
					<Label for="allowFileUploads">Allow File Uploads</Label>
					<p class="text-muted-foreground text-sm">Enable file attachments in submissions</p>
					<Switch id="allowFileUploads" bind:checked={allowFileUploads} disabled={loading} />
				</div>
				<input type="hidden" name="allowFileUploads" value={allowFileUploads ? 'on' : 'off'} />

				{#if allowFileUploads}
					<!-- Max File Count -->
					<div class="space-y-2">
						<Label for="maxFileCount">Max Files Per Submission</Label>
						<Input
							id="maxFileCount"
							name="maxFileCount"
							type="number"
							value={data.form.maxFileCount || 3}
							min="1"
							max="25"
							placeholder="3"
							disabled={loading}
						/>
						<p class="text-muted-foreground text-sm">Maximum: 25 files per submission</p>
					</div>

					<!-- Max File Size -->
					<div class="space-y-2">
						<Label for="maxFileSizeMB">Max File Size (MB)</Label>
						<Input
							id="maxFileSizeMB"
							type="number"
							bind:value={maxFileSizeMB}
							min="1"
							max="100"
							placeholder="2"
							disabled={loading}
						/>
						<input type="hidden" name="maxFileSize" value={maxFileSizeBytes} />
						<p class="text-muted-foreground text-sm">
							Default: 2MB (Maximum: 100MB)
						</p>
					</div>

					<!-- Allowed File Types -->
					<div class="space-y-2">
						<Label for="allowedFileTypes">Allowed File Types (comma-separated)</Label>
						<Input
							id="allowedFileTypes"
							name="allowedFileTypes"
							type="text"
							placeholder=".pdf,.doc,.docx,.jpg,.png"
							value={data.form.allowedFileTypes || ''}
							disabled={loading}
						/>
						<p class="text-muted-foreground text-sm">
							Leave empty to allow all file types
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Response Configuration -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Response Configuration</Card.Title>
				<Card.Description>How the form responds after submission</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Response Type -->
				<div class="space-y-2">
					<Label for="responseType">Response Type *</Label>
					<Select.Root bind:value={responseType} disabled={loading} type="single">
						<Select.Trigger class="w-full">
							{selectedResponseTypeLabel}
						</Select.Trigger>
						<Select.Content>
							{#each responseTypes as type}
								<Select.Item value={type.value} label={type.label}>
									{type.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="responseType" value={responseType} />
					<p class="text-muted-foreground text-sm">
						{#if responseType === 'redirect'}
							Redirect users to a thank you page after submission
						{:else}
							Return JSON response for AJAX/API submissions
						{/if}
					</p>
				</div>

				{#if responseType === 'redirect'}
					<!-- Redirect URL -->
					<div class="space-y-2">
						<Label for="redirectUrl">Redirect URL *</Label>
						<Input
							id="redirectUrl"
							name="redirectUrl"
							type="url"
							placeholder="https://example.com/thank-you"
							value={data.form.redirectUrl || ''}
							disabled={loading}
							required
						/>
						<p class="text-muted-foreground text-sm">URL to redirect to after successful submission</p>
					</div>
				{:else}
					<!-- Success Message (JSON only) -->
					<div class="space-y-2">
						<Label for="successMessage">Success Message *</Label>
						<Textarea
							id="successMessage"
							name="successMessage"
							value={data.form.successMessage || 'Thank you! Your submission has been received.'}
							placeholder="Thank you! Your submission has been received."
							rows={2}
							disabled={loading}
							required
						/>
						<p class="text-muted-foreground text-sm">Message returned in JSON response</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Notifications & Webhooks -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Notifications & Webhooks</Card.Title>
				<Card.Description>Configure how you want to be notified</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Email Notifications -->
				<div class="space-y-2">
					<Label for="sendEmailNotifications">Email Notifications</Label>
					<p class="text-muted-foreground text-sm">Send email when new submissions arrive</p>
					<Switch
						id="sendEmailNotifications"
						bind:checked={sendEmailNotifications}
						disabled={loading}
					/>
				</div>
				<input type="hidden" name="sendEmailNotifications" value={sendEmailNotifications ? 'on' : 'off'} />

				<!-- Notification Emails (conditional) -->
				{#if sendEmailNotifications}
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label for="notificationEmails">Notification Email Addresses</Label>
							<span class="text-muted-foreground text-xs">
								{data.subscription.tier === 'free' ? 'Free: Max 2' : data.subscription.tier === 'pro' ? 'Pro: Max 5' : 'Business: Max 10'}
							</span>
						</div>
						<TagInput
							bind:tags={notificationEmails}
							maxTags={maxEmails}
							placeholder="Add email address..."
							disabled={loading}
						/>
						<input type="hidden" name="notificationEmailsJson" value={JSON.stringify(notificationEmails)} />
					</div>
				{/if}

				<!-- Webhook URL -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label for="webhookUrl">Webhook URL</Label>
						{#if data.subscription.tier === 'free'}
							<span class="text-xs text-amber-600">⭐ Pro Feature</span>
						{/if}
					</div>
					<Input
						id="webhookUrl"
						name="webhookUrl"
						type="url"
						placeholder="https://example.com/webhook"
						value={data.form.webhookUrl || ''}
						disabled={loading || data.subscription.tier === 'free'}
					/>
					<p class="text-muted-foreground text-sm">
						POST submission data to this URL
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Security -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Security</Card.Title>
				<Card.Description>Spam protection and security settings</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Spam Check -->
				<div class="space-y-2">
					<Label for="spamCheckEnabled">Spam Protection</Label>
					<p class="text-muted-foreground text-sm">Enable honeypot and spam detection</p>
					<Switch id="spamCheckEnabled" bind:checked={spamCheckEnabled} disabled={loading} />
				</div>
				<input type="hidden" name="spamCheckEnabled" value={spamCheckEnabled ? 'on' : 'off'} />

				<!-- Honeypot Field Name (conditional) -->
				{#if spamCheckEnabled}
					<div class="space-y-2">
						<Label for="honeypotFieldName">Honeypot Field Name</Label>
						<Input
							id="honeypotFieldName"
							name="honeypotFieldName"
							type="text"
							value={data.form.honeypotFieldName || 'website'}
							placeholder="website"
							disabled={loading}
						/>
						<p class="text-muted-foreground text-sm">
							Hidden field name that bots will fill out (default: "website")
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Actions -->
	<div class="mt-6 flex gap-3">
		<Button type="submit" disabled={loading} class="gap-2">
			{#if loading}
				<Loader2 class="h-4 w-4 animate-spin" />
			{/if}
			Update Form
		</Button>
		<Button
			type="button"
			variant="outline"
			href="/spaces/{data.space.id}/forms/{data.form.id}"
			disabled={loading}
		>
			Cancel
		</Button>
	</div>
</form>
