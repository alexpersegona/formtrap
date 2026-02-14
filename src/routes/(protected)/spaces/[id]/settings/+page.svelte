<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { Settings, ShieldAlert, ShieldCheck, PauseCircle, PlayCircle, AlertTriangle, Trash2 } from 'lucide-svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import { getImageUrl } from '$lib/types/images';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Get the regular variant URL for display in upload component
	let logoUrl = $derived(getImageUrl(data.space.logo, 'regular'));

	let submittingGeneral = $state(false);
	let togglingPrivacy = $state(false);
	let togglingPaused = $state(false);
	let deletingSpace = $state(false);
	let deleteDialogOpen = $state(false);
	let deleteConfirmName = $state('');

	let nameValue = $state(data.space.name);

	// Check if confirmation name matches (lowercase comparison)
	let canDelete = $derived(deleteConfirmName.toLowerCase() === data.space.name.toLowerCase());

	const handleGeneralSubmit: SubmitFunction = () => {
		submittingGeneral = true;

		return async ({ result }) => {
			submittingGeneral = false;

			if (result.type === 'success') {
				toast.success('Settings updated successfully');
				await invalidateAll();
			} else if (result.type === 'failure') {
				if (result.data?.errors?.name) {
					toast.error('Failed to update settings', {
						description: result.data.errors.name
					});
				} else if (result.data?.errors?.logo) {
					toast.error('Failed to upload logo', {
						description: result.data.errors.logo
					});
				} else if (result.data?.errors?.general) {
					toast.error('Failed to update settings', {
						description: result.data.errors.general
					});
				}
			}
		};
	};

	const handlePrivacyToggle: SubmitFunction = () => {
		togglingPrivacy = true;

		return async ({ result }) => {
			togglingPrivacy = false;

			if (result.type === 'success') {
				toast.success('Privacy settings updated');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to update privacy settings', {
					description: result.data?.error || 'Please try again'
				});
			}
		};
	};

	const handlePausedToggle: SubmitFunction = () => {
		togglingPaused = true;

		return async ({ result }) => {
			togglingPaused = false;

			if (result.type === 'success') {
				const newStatus = !data.space.isPaused;
				toast.success(newStatus ? 'Space paused' : 'Space activated');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to update space status', {
					description: result.data?.error || 'Please try again'
				});
			}
		};
	};

	const handleDeleteSpace: SubmitFunction = () => {
		deletingSpace = true;
		deleteDialogOpen = false; // Close dialog immediately

		return async ({ result, update }) => {
			if (result.type === 'failure') {
				deletingSpace = false;
				toast.error('Failed to delete space', {
					description: result.data?.error || 'Please try again'
				});
			}
			// For redirect, just call update() to let SvelteKit handle it
			await update();
		};
	};
</script>

<div class="mb-8 space-y-2">
	<h1 class="text-3xl font-bold tracking-tight">Space Settings</h1>
	<p class="text-muted-foreground">Manage settings for {data.space.name}</p>
</div>

<div class="max-w-4xl space-y-6">
	<!-- General Settings Card -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Settings class="h-5 w-5" />
				General Settings
			</CardTitle>
			<CardDescription>Update your space name and logo</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/updateGeneral" enctype="multipart/form-data" use:enhance={handleGeneralSubmit} class="space-y-6">
				<!-- Name Field -->
				<div class="space-y-2">
					<Label for="name">Space Name</Label>
					<Input
						id="name"
						name="name"
						type="text"
						bind:value={nameValue}
						disabled={submittingGeneral}
						required
						maxlength={100}
						aria-invalid={form?.errors?.name ? true : undefined}
					/>
					{#if form?.errors?.name}
						<p class="text-sm text-destructive">{form.errors.name}</p>
					{/if}
				</div>

				<!-- Logo Upload -->
				<div class="space-y-2">
					<Label>Space Logo</Label>
					<ImageUpload
						name="logo"
						value={logoUrl}
						disabled={submittingGeneral}
						fallbackText={data.space.name.charAt(0).toUpperCase()}
						round={false}
					/>
					{#if form?.errors?.logo}
						<p class="text-sm text-destructive">{form.errors.logo}</p>
					{/if}
					<p class="text-sm text-muted-foreground">
						Automatically optimized and converted to WebP. Multiple sizes generated for different uses.
					</p>
				</div>

				<!-- General Error -->
				{#if form?.errors?.general}
					<div class="rounded-lg border border-destructive bg-destructive/10 p-3">
						<p class="text-sm text-destructive">{form.errors.general}</p>
					</div>
				{/if}

				<!-- Submit Button -->
				<div class="flex justify-end">
					<Button type="submit" disabled={submittingGeneral} variant="fancy" tracking>
						{submittingGeneral ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<!-- Privacy Settings Card -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<ShieldAlert class="h-5 w-5" />
				Privacy Settings
			</CardTitle>
			<CardDescription>Control who can view form submissions in this space</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<Alert.Root variant={data.space.isClientOwned ? 'default' : 'destructive'}>
	
				<!-- <ShieldAlert /> -->

				<Alert.Title >
					{data.space.isClientOwned ? 'Client-Owned Mode (Private)' : 'Standard Mode (Open)'}
				</Alert.Title>
				<Alert.Description >
					{#if data.space.isClientOwned}
						<p>As the space owner, you <strong>cannot view</strong> form submissions. This ensures
						client data remains private. Invited members can still access submissions.</p>
					{:else}
						<p>All space members, including you as owner, can view form submissions.</p>
					{/if}
				</Alert.Description>
			</Alert.Root>

			<!-- Toggle Button -->
			<form
				method="POST"
				action="?/toggleClientOwned"
				use:enhance={handlePrivacyToggle}
				class="flex justify-end"
			>
				<input
					type="hidden"
					name="isClientOwned"
					value={(!data.space.isClientOwned).toString()}
				/>
				<Button type="submit" variant="outline" disabled={togglingPrivacy}>
					{togglingPrivacy ? 'Updating...' : 'Switch to'}
					{data.space.isClientOwned ? 'Standard Mode' : 'Client-Owned Mode'}
				</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Status Management Card -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				{#if data.space.isPaused}
					<PauseCircle class="h-5 w-5" />
				{:else}
					<PlayCircle class="h-5 w-5" />
				{/if}
				Status Management
			</CardTitle>
			<CardDescription>Pause or activate this space</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<Alert.Root variant={data.space.isPaused ? 'destructive' : 'default'}>
				<Alert.Title >
					{data.space.isPaused ? 'Space is Paused' : 'Space is Active'}
				</Alert.Title>
				<Alert.Description >
					{#if data.space.isPaused}
						This space is currently paused. Non-owner members cannot access it. Forms will
						not accept new submissions.
					{:else}
						This space is active. All members can access it and forms are accepting
						submissions.
					{/if}
				</Alert.Description>
			</Alert.Root>

			<!-- Warning for Pausing -->
			{#if !data.space.isPaused}
				
						<p class="text-xs text-muted-foreground"><strong>Note:</strong> Pausing this space will prevent all non-owner members from accessing
						it. Forms will stop accepting submissions. Use this for violations, missed payments, or
						temporary lockdowns.</p>
				
				
			{/if}

			<!-- Toggle Button -->
			<form
				method="POST"
				action="?/togglePaused"
				use:enhance={handlePausedToggle}
				class="flex justify-end"
			>
				<input
					type="hidden"
					name="isPaused"
					value={(!data.space.isPaused).toString()}
				/>
				<Button
					type="submit"
					variant={data.space.isPaused ? "default" : "destructive"}
					disabled={togglingPaused}
					tracking
				>
					{togglingPaused ? 'Updating...' : data.space.isPaused ? 'Activate Space' : 'Pause Space'}
				</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Danger Zone Card -->
	<Card class="border-destructive">
		<CardHeader>
			<CardTitle class="flex items-center gap-2 text-destructive">
				<Trash2 class="h-5 w-5" />
				Danger Zone
			</CardTitle>
			<CardDescription>Permanently delete this space and all its data</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<Alert.Root variant="destructive">
				<AlertTriangle class="h-4 w-4" />
				<Alert.Title>Warning: This action cannot be undone</Alert.Title>
				<Alert.Description>
					Deleting this space will permanently remove:
					<ul class="mt-2 ml-4 list-disc space-y-1">
						<li>All forms associated with this space</li>
						<li>All form submissions and uploaded files</li>
						<li>All team members and invitations</li>
						<li>All space settings and configurations</li>
					</ul>
				</Alert.Description>
			</Alert.Root>

			<Dialog.Root bind:open={deleteDialogOpen}>
				<Dialog.Trigger class="w-full inline-flex justify-end">
					<Button variant="destructive" class="w-full sm:w-auto">
						<Trash2 class="mr-2 h-4 w-4" />
						Delete Space
					</Button>
				</Dialog.Trigger>
				<Dialog.Content class="sm:max-w-md">
					<Dialog.Header>
						<Dialog.Title>Delete Space: {data.space.name}</Dialog.Title>
						<Dialog.Description>
							This action cannot be undone. This will permanently delete the space and all associated data.
						</Dialog.Description>
					</Dialog.Header>

					<form method="POST" action="?/deleteSpace" use:enhance={handleDeleteSpace} class="space-y-4">
						<div class="space-y-2">
							<Label for="confirmName" class="text-sm font-medium">
								Type <code class="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">{data.space.name.toLowerCase()}</code> to confirm
							</Label>
							<Input
								id="confirmName"
								name="confirmName"
								type="text"
								bind:value={deleteConfirmName}
								placeholder="Space name (in lowercase)"
								disabled={deletingSpace}
								required
								class="font-mono"
							/>
							<p class="text-xs text-muted-foreground">
								Please type the space name exactly as shown above, in all lowercase letters.
							</p>
						</div>

						<Dialog.Footer class="flex-col-reverse sm:flex-row sm:justify-end gap-2">
							<Dialog.Close>
								<Button
									type="button"
									variant="outline"
									disabled={deletingSpace}
								>
									Cancel
								</Button>
							</Dialog.Close>
							<Button
								type="submit"
								variant="destructive"
								disabled={!canDelete || deletingSpace}
							>
								{deletingSpace ? 'Deleting...' : 'Delete Space Permanently'}
							</Button>
						</Dialog.Footer>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</CardContent>
	</Card>
</div>
