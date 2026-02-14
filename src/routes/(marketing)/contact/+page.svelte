<script lang="ts">
	import { enhance } from '$app/forms';
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { ActionData } from './$types';
	import { toast } from 'svelte-sonner';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Progress } from '$lib/components/ui/progress';
	import { CheckCircle } from '@lucide/svelte';

	let { form }: { form: ActionData } = $props();

	let loading = $state(false);
	let name = $state('');
	let email = $state('');
	let subject = $state('');
	let message = $state('');
	let turnstileContainer: HTMLDivElement;
	let turnstileWidgetId: string | null = $state(null);

	// Success modal state
	let showSuccessModal = $state(false);
	let progressValue = $state(100);
	let progressInterval: ReturnType<typeof setInterval> | null = null;

	function startSuccessCountdown() {
		showSuccessModal = true;
		progressValue = 100;

		// Clear any existing interval
		if (progressInterval) clearInterval(progressInterval);

		// Update every 40ms for smooth animation (100 steps over 4 seconds)
		const stepDuration = 40;
		const steps = 4000 / stepDuration;
		const decrement = 100 / steps;

		progressInterval = setInterval(() => {
			progressValue -= decrement;
			if (progressValue <= 0) {
				progressValue = 0;
				if (progressInterval) clearInterval(progressInterval);
				showSuccessModal = false;
			}
		}, stepDuration);
	}

	function closeSuccessModal() {
		if (progressInterval) clearInterval(progressInterval);
		showSuccessModal = false;
	}

	$effect(() => {
		if (form?.values) {
			name = form.values.name ?? '';
			email = form.values.email ?? '';
			subject = form.values.subject ?? '';
			message = form.values.message ?? '';
		}
	});

	// Load Turnstile script dynamically and render widget
	// This handles both initial page load and SPA navigation
	onMount(() => {
		const siteKey = env.PUBLIC_TURNSTILE_SITE_KEY;
		if (!siteKey || !turnstileContainer) return;

		function renderWidget() {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const turnstile = (window as any).turnstile;
			if (!turnstile || !turnstileContainer) return;

			// Clear container first
			turnstileContainer.innerHTML = '';

			turnstileWidgetId = turnstile.render(turnstileContainer, {
				sitekey: siteKey,
				theme: 'auto'
			});
		}

		function loadScriptAndRender() {
			// Check if script already exists
			const existingScript = document.querySelector(
				'script[src*="challenges.cloudflare.com/turnstile"]'
			);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if ((window as any).turnstile) {
				// Turnstile already loaded, just render
				renderWidget();
			} else if (existingScript) {
				// Script exists but turnstile not ready yet, wait for it
				const checkInterval = setInterval(() => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					if ((window as any).turnstile) {
						clearInterval(checkInterval);
						renderWidget();
					}
				}, 50);
				setTimeout(() => clearInterval(checkInterval), 10000);
			} else {
				// Load script dynamically
				const script = document.createElement('script');
				script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
				script.async = true;
				script.onload = () => {
					// Small delay to ensure turnstile is initialized
					setTimeout(renderWidget, 100);
				};
				document.head.appendChild(script);
			}
		}

		loadScriptAndRender();

		// Cleanup on unmount
		return () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const turnstile = (window as any).turnstile;
			if (turnstileWidgetId && turnstile) {
				try {
					turnstile.remove(turnstileWidgetId);
				} catch {
					// Widget may already be removed
				}
			}
		};
	});

	let charCount = $derived(message.length);

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async ({ result, update }) => {
			loading = false;
			if (result.type === 'success') {
				// Show success modal with countdown
				startSuccessCountdown();
				name = '';
				email = '';
				subject = '';
				message = '';
				// Reset Turnstile widget
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if (typeof window !== 'undefined' && (window as any).turnstile && turnstileWidgetId) {
					(window as any).turnstile.reset(turnstileWidgetId);
				}
			} else if (result.type === 'failure') {
				const errors = result.data?.errors;
				if (errors?.form) {
					toast.error(errors.form);
				} else if (errors?.turnstile) {
					toast.error(errors.turnstile);
				} else {
					toast.error('Please fix the errors below.');
				}
			}
			await update({ reset: false });
		};
	};
</script>

<div class="container mx-auto px-4 py-12">
	<div class="max-w-lg mx-auto space-y-6">
		<div class="text-center space-y-2">
			<h1 class="text-4xl font-bold tracking-tight">Contact Us</h1>
			<p class="text-muted-foreground">
				Have a question or feedback? We'd love to hear from you.
			</p>
		</div>

		<Card.Root>
			<Card.Content class="pt-6">
				<form method="POST" use:enhance={handleSubmit} class="space-y-4">
					<div class="space-y-2">
						<Label for="name">Name</Label>
						<Input
							id="name"
							name="name"
							bind:value={name}
							placeholder="Your name"
							required
							disabled={loading}
						/>
						{#if form?.errors?.name}
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
							placeholder="you@example.com"
							required
							disabled={loading}
						/>
						{#if form?.errors?.email}
							<p class="text-sm text-destructive">{form.errors.email}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="subject">Subject</Label>
						<select
							id="subject"
							name="subject"
							bind:value={subject}
							required
							disabled={loading}
							class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="" disabled>Select a subject</option>
							<option value="General Inquiry">General Inquiry</option>
							<option value="Support Issue">Support Issue</option>
							<option value="Feature Request">Feature Request</option>
						</select>
						{#if form?.errors?.subject}
							<p class="text-sm text-destructive">{form.errors.subject}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="message">Message</Label>
						<Textarea
							id="message"
							name="message"
							bind:value={message}
							placeholder="Tell us what's on your mind..."
							required
							minlength={15}
							maxlength={500}
							rows={5}
							disabled={loading}
						/>
						<div class="flex justify-between text-xs text-muted-foreground">
							{#if form?.errors?.message}
								<p class="text-destructive">{form.errors.message}</p>
							{:else}
								<span>Min 15 characters</span>
							{/if}
							<span class:text-destructive={charCount > 500}>{charCount}/500</span>
						</div>
					</div>

					<div class="flex justify-center">
						<div bind:this={turnstileContainer}></div>
					</div>
					{#if form?.errors?.turnstile}
						<p class="text-sm text-destructive">{form.errors.turnstile}</p>
					{/if}

					<EmeraldButton type="submit" variant="lighter" class="w-full" disabled={loading}>
						{loading ? 'Sending...' : 'Send Message'}
					</EmeraldButton>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<!-- Success Modal -->
<Dialog.Root bind:open={showSuccessModal} onOpenChange={(open) => !open && closeSuccessModal()}>
	<Dialog.Content class="sm:max-w-md">
		<div class="flex flex-col items-center text-center py-4">
			<div class="rounded-full bg-green-100 dark:bg-green-900/30 p-3 mb-4">
				<CheckCircle class="h-8 w-8 text-green-600 dark:text-green-400" />
			</div>
			<Dialog.Header class="space-y-2">
				<Dialog.Title class="text-xl">Message Sent!</Dialog.Title>
				<Dialog.Description>
					Thanks for reaching out. We'll get back to you as soon as possible.
				</Dialog.Description>
			</Dialog.Header>
		</div>
		<Progress value={progressValue} class="h-1" />
	</Dialog.Content>
</Dialog.Root>
