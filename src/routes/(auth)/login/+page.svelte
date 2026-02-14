<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { signIn, twoFactor } from '$lib/auth-client';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { InputOTP, InputOTPGroup, InputOTPSlot } from '$lib/components/ui/input-otp';
	import { goto } from '$app/navigation';
	import { CircleHelp } from 'lucide-svelte';
	import { logger } from '$lib/utils/logger';

	let email = $state('');
	let password = $state('');
	let rememberMe = $state(false);
	let error = $state('');
	let loading = $state(false);
	let twoFactorRequired = $state(false);
	let twoFactorCode = $state('');
	let useBackupCode = $state(false);

	// Show account deleted toast
	onMount(() => {
		if ($page.url.searchParams.get('accountDeleted') === 'true') {
			toast.success('Account Deleted', {
				description: 'Your account has been successfully deleted. All your data has been removed.',
				duration: 5000
			});
			// Clean up URL parameter
			window.history.replaceState({}, '', '/login');
		}
	});

	async function handleLogin(e: Event): Promise<void> {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			logger.log('Attempting login for:', email);
			const result = await signIn.email({
				email,
				password,
				dontRememberMe: !rememberMe,
				callbackURL: '/dashboard'
			});

			logger.log('Login result:', result);

			// Check if 2FA is required
			if (result.data?.twoFactorRedirect) {
				logger.log('2FA required, showing verification form');
				twoFactorRequired = true;
				error = '';
			} else if (result.error) {
				logger.error('Login error:', result.error);

				if (result.error.status === 429 || result.error.error) {
					// Rate limit error
					error = result.error.error || result.error.message || 'Too many login attempts. Please try again later.';
				} else {
					// Regular auth error
					error = result.error.message || 'Invalid email or password';
				}
			} else {
				logger.log('Login successful, redirecting...');
				goto('/dashboard');
			}
		} catch (err) {
			logger.error('Login exception:', err);
			error = 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}

	async function handleTwoFactorVerify(e: Event): Promise<void> {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			logger.log('Verifying 2FA code:', twoFactorCode, 'useBackupCode:', useBackupCode);

			let result;
			if (useBackupCode) {
				// Use backup code verification endpoint
				logger.log('Using backup code verification');
				result = await twoFactor.verifyBackupCode({ code: twoFactorCode });
			} else {
				// Use TOTP verification endpoint
				logger.log('Using TOTP verification');
				result = await twoFactor.verifyTotp({ code: twoFactorCode });
			}

			logger.log('2FA verification result:', result);

			if (result.error) {
				logger.error('2FA verification error:', result.error);
				if (result.error.status === 400 || result.error.status === 401) {
					error = useBackupCode
						? 'Invalid backup code. Please try again.'
						: 'Invalid verification code. Please try again.';
				} else {
					error = result.error.message || 'Failed to verify code';
				}
			} else {
				logger.log('2FA verification successful, redirecting...');
				goto('/dashboard');
			}
		} catch (err) {
			logger.error('2FA verification exception:', err);
			error = 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto px-4 py-12">
	<div class="max-w-md mx-auto">
		<Card.Root>
			<Card.Header class="space-y-1">
				<Card.Title class="text-2xl font-bold">
					{twoFactorRequired ? 'Two-Factor Authentication' : 'Welcome back'}
				</Card.Title>
				<Card.Description>
					{#if twoFactorRequired}
						{useBackupCode
							? 'Enter one of your backup codes'
							: 'Enter the 6-digit code from your authenticator app'}
					{:else}
						Enter your email and password to sign in to your account
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form onsubmit={twoFactorRequired ? handleTwoFactorVerify : handleLogin} class="space-y-4">
					{#if error}
						<div class="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
							{error}
						</div>
					{/if}

					{#if twoFactorRequired}
						<!-- 2FA Verification Step -->
						{#if useBackupCode}
							<!-- Backup Code Input -->
							<div class="space-y-2">
								<Label for="backupCode">Backup Code</Label>
								<Input
									id="backupCode"
									type="text"
									bind:value={twoFactorCode}
									required
									placeholder="XXXXX-XXXXX"
									disabled={loading}
									autofocus
									class="text-center tracking-wider font-mono"
								/>
								<p class="text-xs text-muted-foreground text-center">
									Enter one of your 10-character backup codes
								</p>
							</div>
						{:else}
							<!-- PIN Input for TOTP -->
							<div class="space-y-2">
								<Label for="twoFactorCode" class="text-center block">Verification Code</Label>
								<div class="flex justify-center">
									<InputOTP
										bind:value={twoFactorCode}
										maxlength={6}
										disabled={loading}
										type="numeric"
									>
										{#snippet children({ cells })}
											<InputOTPGroup>
												{#each cells as cell, index}
													<InputOTPSlot {cell} {index} />
												{/each}
											</InputOTPGroup>
										{/snippet}
									</InputOTP>
								</div>
								<p class="text-xs text-muted-foreground text-center">
									Enter the 6-digit code from your authenticator app
								</p>
							</div>
						{/if}

						<!-- Toggle Link -->
						<div class="text-center">
							<button
								type="button"
								onclick={() => {
									useBackupCode = !useBackupCode;
									twoFactorCode = '';
									error = '';
								}}
								class="text-sm text-primary hover:underline"
								disabled={loading}
							>
								{useBackupCode ? 'Use authenticator app instead' : "Lost your device? Use a backup code"}
							</button>
						</div>

						<div class="flex gap-2">
							<Button
								variant="secondary"
								type="button"
								onclick={() => {
									twoFactorRequired = false;
									twoFactorCode = '';
									useBackupCode = false;
									error = '';
								}}
								disabled={loading}
								class="flex-1"
							>
								Back
							</Button>
							<EmeraldButton variant="lighter" type="submit" disabled={loading || !twoFactorCode.trim()} class="flex-1">
								{loading ? 'Verifying...' : 'Verify'}
							</EmeraldButton>
						</div>
					{:else}
						<!-- Regular Login Step -->
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input
								id="email"
								type="email"
								bind:value={email}
								required
								placeholder="name@example.com"
								disabled={loading}
							/>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label for="password">Password</Label>
								<a href="/forgot-password" class="text-sm text-primary hover:underline">
									Forgot password?
								</a>
							</div>
							<Input
								id="password"
								type="password"
								bind:value={password}
								required
								placeholder="Enter your password"
								disabled={loading}
							/>
						</div>

						<div class="flex items-center gap-2">
							<Checkbox
								id="rememberMe"
								bind:checked={rememberMe}
								disabled={loading}
							/>
							<Label for="rememberMe" class="text-sm font-normal cursor-pointer">
								Remember me for 30 days
							</Label>
							<Tooltip.Provider>
								<Tooltip.Root>
									<Tooltip.Trigger class="inline-flex items-center">
										<CircleHelp class="h-3.5 w-3.5 text-muted-foreground" />
									</Tooltip.Trigger>
									<Tooltip.Content>
										<p class="max-w-xs text-xs">
											Your login session will be stored for 30 days. Only use this on devices you trust.
										</p>
									</Tooltip.Content>
								</Tooltip.Root>
							</Tooltip.Provider>
						</div>

						<EmeraldButton variant="lighter" type="submit" disabled={loading} class="w-full">
							{loading ? 'Signing in...' : 'Sign in'}
						</EmeraldButton>
					{/if}

					{#if !twoFactorRequired}
						<p class="text-center text-sm text-muted-foreground">
							Don't have an account?
							<a href="/register" class="text-primary hover:underline font-medium">
								Sign up
							</a>
						</p>
					{/if}
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
