<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Mail, AlertCircle } from 'lucide-svelte';
	import { authClient, useSession } from '$lib/auth-client';
	import { toast } from 'svelte-sonner';

	let { form } = $props<{ form: ActionData }>();

	const session = useSession();

	let resendLoading = $state(false);

	async function handleResend() {
		resendLoading = true;

		// Wait for session to be loaded
		if ($session.isPending) {
			toast.error('Loading session data', {
				description: 'Please try again in a moment.'
			});
			resendLoading = false;
			return;
		}

		const userEmail = $session.data?.user?.email;
		if (!userEmail) {
			toast.error('Technical issue', {
				description: 'Please try again or contact support.'
			});
			resendLoading = false;
			return;
		}

		try {
			console.log('📧 Resending verification email to:', userEmail);

			// Call Better Auth's resend verification endpoint using the client
			const response = await authClient.sendVerificationEmail({
				email: userEmail,
				callbackURL: window.location.origin + '/dashboard'
			});

			console.log('📧 Verification email response:', response);

			if (response.data) {
				console.log('✅ Verification email sent successfully');
				toast.success('Verification email sent!', {
					description: 'Please check your inbox and spam folder.',
					duration: 5000
				});
			} else if (response.error) {
				console.error('❌ Verification email error:', response.error);
				toast.error('Failed to send email', {
					description: response.error.message || 'There was a technical issue. Please try again.',
					duration: 5000
				});
			}
		} catch (err: any) {
			console.error('❌ Failed to resend verification email:', err);
			toast.error('Failed to send email', {
				description: 'There was a technical issue. Please try again.',
				duration: 5000
			});
		} finally {
			resendLoading = false;
		}
	}

	async function handleSignOut() {
		await authClient.signOut();
		window.location.href = '/login';
	}
</script>

<svelte:head>
	<title>Verify Your Email</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="max-w-md mx-auto">
		<Card.Root>
			<Card.Header class="space-y-4 text-center">
				<div class="flex justify-center">
					<div class="rounded-full bg-emerald-500/10 p-3">
						<Mail class="h-12 w-12 text-emerald-600" />
					</div>
				</div>
				<Card.Title class="text-2xl font-bold">Verify Your Email Address</Card.Title>
				<Card.Description class="text-base">
					We've sent a verification link to your email address. Please check your inbox and click the
					link to verify your account.
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-6">


				{#if form?.error}
					<div class="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm flex items-start gap-2">
						<AlertCircle class="h-4 w-4 mt-0.5 flex-shrink-0" />
						<span>{form.error}</span>
					</div>
				{/if}

				<div class="space-y-4">
					<div class="bg-muted p-4 rounded-lg space-y-2">
						<h3 class="font-medium text-sm">What to do next:</h3>
						<ol class="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
							<li>Check your email inbox (and spam folder)</li>
							<li>Click the verification link in the email</li>
							<li>Return here and refresh the page</li>
						</ol>
					</div>

					<Button
						variant="fancy"
						tracking
						type="button"
						onclick={handleResend}
						disabled={$session.isPending || resendLoading}
						class="w-full"
					>
						{#if $session.isPending}
							Loading...
						{:else if resendLoading}
							Sending...
						{:else}
							Resend Verification Email
						{/if}
					</Button>

					<Button
						variant="outline"
						type="button"
						onclick={handleSignOut}
						class="w-full"
					>
						Sign Out
					</Button>
				</div>

				<div class="text-center text-sm text-muted-foreground">
					<p>
						Need help?
						<a href="mailto:support@example.com" class="text-primary hover:underline">
							Contact Support
						</a>
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
