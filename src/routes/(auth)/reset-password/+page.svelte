<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let password = $state('');
	let confirmPassword = $state('');

	const token = $derived($page.url.searchParams.get('token'));

	function handleSubmit() {
		loading = true;

		return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
			loading = false;

			if (result.type === 'redirect') {
				toast.success('Password reset successfully', {
					description: 'You can now log in with your new password.',
					duration: 3000
				});
				// Manually redirect
				goto('/login');
			} else if (result.type === 'failure') {
				// Check if it's a rate limit error (status 429)
				if (result.status === 429) {
					toast.error('Too many attempts', {
						description: form?.error || 'Please wait before trying again.',
						duration: 6000
					});
				} else {
					toast.error('Failed to reset password', {
						description: form?.error || 'Please try again.',
						duration: 4000
					});
				}
			}

			// Apply default SvelteKit behavior (updates form prop)
			await update();
		};
	}
</script>

<svelte:head>
	<title>Reset Password</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="max-w-md mx-auto">
		{#if !token}
			<Card.Root>
				<Card.Header class="space-y-1">
					<Card.Title class="text-2xl font-bold">Reset Password</Card.Title>
					<Card.Description>
						Invalid or missing reset token
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-center text-sm text-muted-foreground">
						<a href="/forgot-password" class="text-primary hover:underline font-medium">
							Request a new reset link
						</a>
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Header class="space-y-1">
					<Card.Title class="text-2xl font-bold">Reset Password</Card.Title>
					<Card.Description>
						Enter your new password below
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="POST" use:enhance={handleSubmit}>
						<input type="hidden" name="token" value={token} />

						<div class="space-y-4">
							<div class="space-y-2">
								<Label for="password">New Password</Label>
								<Input
									id="password"
									name="password"
									type="password"
									bind:value={password}
									placeholder="Enter new password"
									disabled={loading}
									required
									minlength="8"
									aria-invalid={form?.errors?.password ? true : undefined}
								/>
								{#if form?.errors?.password}
									<p class="text-sm text-destructive">{form.errors.password}</p>
								{/if}
							</div>

							<div class="space-y-2">
								<Label for="confirmPassword">Confirm Password</Label>
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									bind:value={confirmPassword}
									placeholder="Confirm new password"
									disabled={loading}
									required
									minlength="8"
									aria-invalid={form?.errors?.confirmPassword ? true : undefined}
								/>
								{#if form?.errors?.confirmPassword}
									<p class="text-sm text-destructive">{form.errors.confirmPassword}</p>
								{/if}
							</div>

							{#if form?.error}
								<p class="text-sm text-destructive">{form.error}</p>
							{/if}

							<EmeraldButton variant="lighter" type="submit" disabled={loading} class="w-full">
								{loading ? 'Resetting...' : 'Reset Password'}
							</EmeraldButton>
						</div>

						<p class="text-center text-sm text-muted-foreground">
							Remember your password?
							<a href="/login" class="text-primary hover:underline font-medium">
								Back to login
							</a>
						</p>
					</form>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
