<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { authClient, useSession } from '$lib/auth-client';
	import { getImageUrl } from '$lib/types/images';
	import PageIntro from '$lib/components/page-intro.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const session = useSession();

	// Get the regular variant URL for display in upload component
	let avatarUrl = $derived(getImageUrl(data.user?.image, 'regular'));

	let loading = $state(false);
	let name = $state(data.user?.name ?? '');
	let email = $state(data.user?.email ?? '');
	let imageChanged = $state(false);

	// Track original values for dirty state
	const originalValues = $derived({
		name: data.user?.name ?? '',
		email: data.user?.email ?? '',
		image: data.user?.image ?? null
	});

	// Calculate if form has changes (is dirty)
	const isDirty = $derived(
		name.trim() !== originalValues.name ||
		email.trim() !== originalValues.email ||
		imageChanged
	);

	// Sync state with data when it changes (after invalidateAll)
	$effect(() => {
		if (data.user) {
			name = data.user.name ?? '';
			email = data.user.email ?? '';
			imageChanged = false;
		}
	});

	function handleSubmit() {
		loading = true;

		return async ({ result, update }: { result: any; update: () => Promise<void> }): Promise<void> => {
			loading = false;

			if (result.type === 'success') {
				toast.success('Profile updated successfully', {
					duration: 3000
				});

				// Fetch fresh session from database (bypassing cookie cache)
				const freshSession = await authClient.getSession({
					query: { disableCookieCache: true }
				});

				// Manually update the nano-store with fresh session data
				if (freshSession?.data) {
					session.set({
						data: freshSession.data,
						error: null,
						isPending: false,
						isRefetching: false
					});
				}

				// Refresh SvelteKit page data
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to update profile', {
					description: 'Please check the form for errors.',
					duration: 4000
				});
			}

			// Apply default SvelteKit behavior (updates form prop)
			await update();
		};
	}
</script>

<div class="max-w-3xl mx-auto space-y-6">
	<PageIntro
		title="Profile Settings"
		description="Manage your account information and preferences"
	/>

		<Card.Root>
			<Card.Header>
				<Card.Title>Personal Information</Card.Title>
				<Card.Description>Update your profile details and photo</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/updateProfile" enctype="multipart/form-data" use:enhance={handleSubmit}>
					<div class="space-y-6">
						<!-- Profile Image -->
						<div class="space-y-2">
							<Label>Profile Photo</Label>
							<ImageUpload
								name="image"
								value={avatarUrl}
								disabled={loading}
								error={form?.errors?.image}
								fallbackText={data.user?.name?.charAt(0).toUpperCase() || '?'}
								maxSize={5}
								onchange={(changed) => imageChanged = changed}
							/>
						</div>

						<!-- Name Field -->
						<div class="space-y-2">
							<Label for="name">Name</Label>
							<Input
								id="name"
								name="name"
								type="text"
								bind:value={name}
								placeholder="Enter your name"
								disabled={loading}
								required
								aria-invalid={form?.errors?.name ? true : undefined}
							/>
							{#if form?.errors?.name}
								<p class="text-sm text-destructive">{form.errors.name}</p>
							{/if}
						</div>

						<!-- Email Field -->
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								bind:value={email}
								placeholder="Enter your email"
								disabled={loading}
								required
								aria-invalid={form?.errors?.email ? true : undefined}
							/>
							{#if form?.errors?.email}
								<p class="text-sm text-destructive">{form.errors.email}</p>
							{/if}
						</div>

						<!-- Account Info (Read-only) -->
						<div class="space-y-4 pt-4 border-t">
							<div class="grid grid-cols-2 gap-4">
								<div>
									<Label class="text-muted-foreground">Account ID</Label>
									<p class="text-sm font-mono mt-1">{data.user?.id}</p>
								</div>
								<div>
									<Label class="text-muted-foreground">Role</Label>
									<p class="text-sm mt-1 capitalize">{data.user?.role}</p>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<Label class="text-muted-foreground">Member Since</Label>
									<p class="text-sm mt-1">
										{data.user?.createdAt
											? new Date(data.user.createdAt).toLocaleDateString('en-US', {
													year: 'numeric',
													month: 'long',
													day: 'numeric'
												})
											: 'N/A'}
									</p>
								</div>
								<div>
									<Label class="text-muted-foreground">Email Verified</Label>
									<p class="text-sm mt-1">
										{data.user?.emailVerified ? '✓ Verified' : '✗ Not verified'}
									</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="flex justify-end mt-6">
						<Button type="submit" disabled={!isDirty || loading} variant="fancy" tracking>
							{loading ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	
</div>
