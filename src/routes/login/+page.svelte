<script lang="ts">
	import { signIn } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			const result = await signIn.email({
				email,
				password
			});

			if (result.error) {
				error = result.error.message || 'Login failed';
			} else {
				// Redirect to dashboard on success
				goto('/dashboard');
			}
		} catch (err) {
			error = 'An unexpected error occurred';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto px-4 py-12">
	<div class="max-w-md mx-auto">
		<Card.Root>
			<Card.Header class="space-y-1">
				<Card.Title class="text-2xl font-bold">Welcome back</Card.Title>
				<Card.Description>
					Enter your email and password to sign in to your account
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form onsubmit={handleLogin} class="space-y-4">
					{#if error}
						<div class="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
							{error}
						</div>
					{/if}

					<div class="space-y-2">
						<label for="email" class="text-sm font-medium leading-none">
							Email
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							placeholder="name@example.com"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					<div class="space-y-2">
						<label for="password" class="text-sm font-medium leading-none">
							Password
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							placeholder="Enter your password"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					<Button type="submit" class="w-full" disabled={loading}>
						{loading ? 'Signing in...' : 'Sign in'}
					</Button>

					<p class="text-center text-sm text-muted-foreground">
						Don't have an account?
						<a href="/register" class="text-primary hover:underline font-medium">
							Sign up
						</a>
					</p>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
