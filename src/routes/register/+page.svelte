<script lang="ts">
	import { signUp } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { goto } from '$app/navigation';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleRegister(e: Event) {
		e.preventDefault();
		loading = true;
		error = '';

		// Validate passwords match
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		// Validate password length
		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			loading = false;
			return;
		}

		try {
			const result = await signUp.email({
				email,
				password,
				name
			});

			if (result.error) {
				error = result.error.message || 'Registration failed';
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
				<Card.Title class="text-2xl font-bold">Create an account</Card.Title>
				<Card.Description>
					Enter your information to create your account
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form onsubmit={handleRegister} class="space-y-4">
					{#if error}
						<div class="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
							{error}
						</div>
					{/if}

					<div class="space-y-2">
						<label for="name" class="text-sm font-medium leading-none">
							Name
						</label>
						<input
							id="name"
							type="text"
							bind:value={name}
							required
							placeholder="John Doe"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

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
							placeholder="Create a password (min 8 characters)"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					<div class="space-y-2">
						<label for="confirmPassword" class="text-sm font-medium leading-none">
							Confirm Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							required
							placeholder="Confirm your password"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					<Button type="submit" class="w-full" disabled={loading}>
						{loading ? 'Creating account...' : 'Create account'}
					</Button>

					<p class="text-center text-sm text-muted-foreground">
						Already have an account?
						<a href="/login" class="text-primary hover:underline font-medium">
							Sign in
						</a>
					</p>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
