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
	import { Loader2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let isActive = $state(true);
	let allowFileUploads = $state(false);
	let spamCheckEnabled = $state(true);
	let sendEmailNotifications = $state(true);
	let responseType = $state('json');
	let notificationEmails = $state<string[]>([]);

	// File size in MB (default 2MB)
	let maxFileSizeMB = $state(2);

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
				toast.success('Form created successfully!');
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
	<title>Create Form - {data.space.name}</title>
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">Create Form</h1>
		<p class="text-muted-foreground">{data.space.name}</p>
	</div>

	<!-- Limit Warning -->
	{#if !data.canCreateForm && data.limitReason}
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
			<p><strong>Cannot Create Form:</strong></p>
			<p>{data.limitReason}</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if form?.error}
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
			<p>{form.error}</p>
		</div>
	{/if}

	<form method="POST" use:enhance={handleSubmit}>
		<!-- Basic Info -->
		<Card.Root class="mb-6">
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
						value={form?.name || ''}
						required
						disabled={loading || !data.canCreateForm}
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
						disabled={loading || !data.canCreateForm}
					/>
				</div>

				<!-- Is Active -->
				<div class="space-y-2">
					<Label for="isActive">Active</Label>
					<p class="text-muted-foreground text-sm">Form is accepting submissions</p>
					<Switch
						id="isActive"
						bind:checked={isActive}
						disabled={loading || !data.canCreateForm}
					/>
				</div>
				<input type="hidden" name="isActive" value={isActive ? 'on' : 'off'} />
			</Card.Content>
		</Card.Root>

		<!-- File Upload Settings -->
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>File Upload Settings</Card.Title>
				<Card.Description>Configure file upload options</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Allow File Uploads -->
				<div class="space-y-2">
					<Label for="allowFileUploads">Allow File Uploads</Label>
					<p class="text-muted-foreground text-sm">Enable file attachments in submissions</p>
					<Switch
						id="allowFileUploads"
						bind:checked={allowFileUploads}
						disabled={loading || !data.canCreateForm}
					/>
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
							value="3"
							min="1"
							max="25"
							placeholder="3"
							disabled={loading || !data.canCreateForm}
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
							disabled={loading || !data.canCreateForm}
						/>
						<input type="hidden" name="maxFileSize" value={maxFileSizeBytes} />
						<p class="text-muted-foreground text-sm">Default: 2MB (Maximum: 100MB)</p>
					</div>

					<!-- Allowed File Types -->
					<div class="space-y-2">
						<Label for="allowedFileTypes">Allowed File Types (comma-separated)</Label>
						<Input
							id="allowedFileTypes"
							name="allowedFileTypes"
							type="text"
							placeholder=".pdf,.doc,.docx,.jpg,.png"
							disabled={loading || !data.canCreateForm}
						/>
						<p class="text-muted-foreground text-sm">
							Leave empty to allow all file types
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Response Configuration -->
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>Response Configuration</Card.Title>
				<Card.Description>How the form responds after submission</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Response Type -->
				<div class="space-y-2">
					<Label for="responseType">Response Type *</Label>
					<Select.Root bind:value={responseType} disabled={loading || !data.canCreateForm} type="single">
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
							disabled={loading || !data.canCreateForm}
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
							value="Thank you! Your submission has been received."
							placeholder="Thank you! Your submission has been received."
							rows={2}
							disabled={loading || !data.canCreateForm}
							required
						/>
						<p class="text-muted-foreground text-sm">Message returned in JSON response</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Notifications & Webhooks -->
		<Card.Root class="mb-6">
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
						disabled={loading || !data.canCreateForm}
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
							disabled={loading || !data.canCreateForm}
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
						disabled={loading || !data.canCreateForm || data.subscription.tier === 'free'}
					/>
					<p class="text-muted-foreground text-sm">
						POST submission data to this URL
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Security -->
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>Security</Card.Title>
				<Card.Description>Spam protection and security settings</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Spam Check -->
				<div class="space-y-2">
					<Label for="spamCheckEnabled">Spam Protection</Label>
					<p class="text-muted-foreground text-sm">Enable honeypot and spam detection</p>
					<Switch
						id="spamCheckEnabled"
						bind:checked={spamCheckEnabled}
						disabled={loading || !data.canCreateForm}
					/>
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
							value="website"
							placeholder="website"
							disabled={loading || !data.canCreateForm}
						/>
						<p class="text-muted-foreground text-sm">
							Hidden field name that bots will fill out (default: "website")
						</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Actions -->
		<div class="flex gap-3">
			<Button type="submit" disabled={loading || !data.canCreateForm} class="gap-2">
				{#if loading}
					<Loader2 class="h-4 w-4 animate-spin" />
				{/if}
				Create Form
			</Button>
			<Button
				type="button"
				variant="outline"
				href="/spaces/{data.space.id}?tab=forms"
				disabled={loading}
			>
				Cancel
			</Button>
		</div>
	</form>
</div>
