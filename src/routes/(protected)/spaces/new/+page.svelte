<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { goto } from '$app/navigation';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { ShieldAlert } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let nameValue = $state(form?.name ?? '');

	const handleSubmit: SubmitFunction = ({ cancel, formData }) => {
		loading = true;

		return async ({ result }) => {
			if (result.type === 'redirect') {
				toast.success('Space created successfully!');
				// Manually navigate to the redirect location
				await goto(result.location);
			} else if (result.type === 'failure') {
				loading = false;
				// Update form prop with errors
				form = result.data as ActionData;

				// Show general error toast if present
				if (result.data?.error) {
					toast.error(result.data.error);
				}
			} else if (result.type === 'error') {
				loading = false;
				toast.error('An unexpected error occurred');
			}
		};
	};
</script>

<div class="container mx-auto max-w-2xl py-8">
	<Card>
		<CardHeader>
			<CardTitle>Create New Space</CardTitle>
			<CardDescription>
				Spaces help you organize forms and submissions for different projects or clients
			</CardDescription>
		</CardHeader>
		<CardContent>
			<!-- Show subscription limits -->
			{#if data.subscription}
				<div class="bg-muted mb-6 rounded-lg p-4">
					<p class="text-muted-foreground text-sm">
						<strong>Your Plan:</strong>
						{data.subscription.tier.charAt(0).toUpperCase() + data.subscription.tier.slice(1)}
					</p>
					<p class="text-muted-foreground text-sm">
						<strong>Spaces:</strong>
						{data.currentSpaceCount} / {data.subscription.maxSpaces}
					</p>
				</div>
			{/if}

			<!-- Show limit reached warning -->
			{#if !data.canCreateSpace && data.limitReason}
				<div class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
					<p><strong>Limit Reached:</strong></p>
					<p>{data.limitReason}</p>
				</div>
			{/if}

			<!-- Show error if any -->
			{#if form?.error}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
					{form.error}
				</div>
			{/if}

			<form method="POST" enctype="multipart/form-data" use:enhance={handleSubmit} class="space-y-6">
				<!-- Space Name -->
				<div class="space-y-2">
					<Label for="name">Space Name *</Label>
					<Input
						id="name"
						name="name"
						type="text"
						placeholder="e.g., My Project, Client Name, etc."
						bind:value={nameValue}
						required
						disabled={loading}
						maxlength={100}
					/>
					{#if form?.errors?.name}
						<p class="text-sm text-destructive">{form.errors.name}</p>
					{/if}
					<p class="text-muted-foreground text-sm">
						Give your space a descriptive name that helps you identify it
					</p>
				</div>

				<!-- Logo Upload -->
				<div class="space-y-2">
					<Label>Space Logo</Label>
					<ImageUpload
						name="logo"
						disabled={loading}
						fallbackText={nameValue.charAt(0).toUpperCase() || 'S'}
						round={false}
					/>
					{#if form?.errors?.logo}
						<p class="text-sm text-destructive">{form.errors.logo}</p>
					{/if}
					<p class="text-muted-foreground text-sm">
						Optional. Automatically optimized and converted to WebP.
					</p>
				</div>

				<!-- Privacy Toggle -->
				<div class="space-y-4 rounded-lg border p-4">
					<div class="flex items-start space-x-3">
						<Checkbox id="isClientOwned" name="isClientOwned" disabled={loading} />
						<div class="flex-1">
							<Label
								for="isClientOwned"
								class="flex items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								<ShieldAlert class="mr-2 h-4 w-4 text-amber-500" />
								Client-Owned Space
							</Label>
							<p class="text-muted-foreground mt-2 text-sm">
								Enable this if form submissions contain private client data. As the space owner, you
								will <strong>not</strong> be able to view submissions, ensuring client privacy. Other
								members you invite will still have access.
							</p>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="flex justify-end space-x-3">
					<Button href="/spaces" variant="outline" disabled={loading}>Cancel</Button>
					<Button type="submit" disabled={loading || !data.canCreateSpace}>
						{loading ? 'Creating...' : 'Create Space'}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
