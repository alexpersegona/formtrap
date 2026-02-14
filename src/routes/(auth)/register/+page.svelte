<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import type { ActionData } from './$types';
	import { logger } from '$lib/utils/logger';

	let { form }: { form: ActionData } = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);

	// Track which fields have been touched
	let touched = $state({
		name: false,
		email: false,
		password: false,
		confirmPassword: false
	});

	// Real-time validation errors
	const validationErrors = $derived({
		name: touched.name && !name.trim() ? 'Name is required' : '',
		email: touched.email && !email.trim() ? 'Email is required' : '',
		password: touched.password && password.length > 0 && password.length < 8
			? 'Password must be at least 8 characters'
			: '',
		confirmPassword: touched.confirmPassword && confirmPassword.length > 0 && password !== confirmPassword
			? 'Passwords do not match'
			: ''
	});

	// Check if form is valid for submission
	const isFormValid = $derived(
		name.trim() !== '' &&
		email.trim() !== '' &&
		password.length >= 8 &&
		password === confirmPassword
	);

	function handleBlur(field: keyof typeof touched) {
		touched[field] = true;
	}

	const handleSubmit: SubmitFunction = ({ cancel, formData }) => {
		logger.log('Registration form submit function called');
		logger.log('Form data:', { name, email, password: '***' });

		// Mark all fields as touched on submit
		touched.name = true;
		touched.email = true;
		touched.password = true;
		touched.confirmPassword = true;

		// Prevent submission if form is invalid
		if (!isFormValid) {
			logger.warn('Form validation failed, cancelling submission');
			cancel();
			return;
		}

		logger.log('Form is valid, submitting...');
		loading = true;

		// Return the callback directly (not from another function)
		return async ({ result }) => {
			logger.log('Registration result received:', result.type, result);
			logger.log('Result data:', result.data);

			if (result.type === 'failure') {
				logger.error('Registration failed:', result.data);
				loading = false;
				// Update form prop with errors
				form = result.data as ActionData;
			} else if (result.type === 'redirect') {
				logger.log('Registration successful, redirecting to:', result.location);
				// Manually navigate to the redirect location
				await goto(result.location);
			} else if (result.type === 'error') {
				logger.error('Registration error:', result.error);
				loading = false;
			}
		};
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
				<form method="POST" use:enhance={handleSubmit} class="space-y-4">
					{#if form?.error}
						<div class="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
							{form.error}
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="name">Name</Label>
						<Input
							id="name"
							name="name"
							type="text"
							bind:value={name}
							onblur={() => handleBlur('name')}
							placeholder="John Doe"
							disabled={loading}
							required
							aria-invalid={validationErrors.name || form?.errors?.name ? true : undefined}
						/>
						{#if validationErrors.name}
							<p class="text-sm text-destructive">{validationErrors.name}</p>
						{:else if form?.errors?.name}
							<p class="text-sm text-destructive">{form.errors.name}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							bind:value={email}
							onblur={() => handleBlur('email')}
							placeholder="name@example.com"
							disabled={loading}
							required
							aria-invalid={validationErrors.email || form?.errors?.email ? true : undefined}
						/>
						{#if validationErrors.email}
							<p class="text-sm text-destructive">{validationErrors.email}</p>
						{:else if form?.errors?.email}
							<p class="text-sm text-destructive">{form.errors.email}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							bind:value={password}
							onblur={() => handleBlur('password')}
							placeholder="Create a password (min 8 characters)"
							disabled={loading}
							required
							autocomplete="new-password"
							data-1p-ignore
							data-lpignore="true"
							aria-invalid={validationErrors.password || form?.errors?.password ? true : undefined}
						/>
						{#if validationErrors.password}
							<p class="text-sm text-destructive">{validationErrors.password}</p>
						{:else if form?.errors?.password}
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
							onblur={() => handleBlur('confirmPassword')}
							placeholder="Confirm your password"
							disabled={loading}
							required
							autocomplete="new-password"
							data-1p-ignore
							data-lpignore="true"
							aria-invalid={validationErrors.confirmPassword || form?.errors?.confirmPassword ? true : undefined}
						/>
						{#if validationErrors.confirmPassword}
							<p class="text-sm text-destructive">{validationErrors.confirmPassword}</p>
						{:else if form?.errors?.confirmPassword}
							<p class="text-sm text-destructive">{form.errors.confirmPassword}</p>
						{/if}
					</div>

					<EmeraldButton variant="lighter" type="submit" class="w-full" disabled={loading}>
						{loading ? 'Creating account...' : 'Create account'}
					</EmeraldButton>

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
