<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let email = $state('');

	function handleSubmit() {
		loading = true;

		return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
			loading = false;

			if (result.type === 'success') {
				toast.success('Password reset email sent', {
					description: 'Check your email for a link to reset your password.',
					duration: 5000
				});
				email = ''; // Clear the form
			} else if (result.type === 'failure') {
				// Check if it's a rate limit error (status 429)
				if (result.status === 429) {
					toast.error('Too many requests', {
						description: form?.error || 'Please wait before trying again.',
						duration: 6000
					});
				} else {
					toast.error('Failed to send reset email', {
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
	<title>Forgot Password</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="max-w-md mx-auto">
		<Card.Root>
			<Card.Header class="space-y-1">
				<Card.Title class="text-2xl font-bold">Forgot Password?</Card.Title>
				<Card.Description>
					Enter your email and we'll send you a link to reset your password
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" use:enhance={handleSubmit}>
					<div class="space-y-4">
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
								aria-invalid={form?.error ? true : undefined}
							/>
							{#if form?.error}
								<p class="text-sm text-destructive">{form.error}</p>
							{/if}
						</div>

						<EmeraldButton variant="lighter" type="submit" disabled={loading} class="w-full">
							{loading ? 'Sending...' : 'Send Reset Link'}
						</EmeraldButton>

						<p class="text-center text-sm text-muted-foreground">
						Remember your password?
						<a href="/login" class="text-primary hover:underline font-medium">
							Back to login
						</a>
					</p>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
