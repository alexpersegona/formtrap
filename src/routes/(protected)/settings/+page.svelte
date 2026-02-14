<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { twoFactor } from '$lib/auth-client';
	import QRCode from 'qrcode';
	import { logger } from '$lib/utils/logger';
	import PageIntro from '$lib/components/page-intro.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Shield, ShieldCheck, Copy, Check, CreditCard, ArrowRight, Crown, TrendingUp, Calendar, Settings } from 'lucide-svelte';
	import type { ActionData, PageData} from './$types';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Tab state from URL query param
	let activeTab = $derived($page.url.searchParams.get('tab') || 'account');

	// Update URL when tab changes (client-side only, no page reload)
	function handleTabChange(value: string | undefined) {
		if (value && value !== 'account') {
			goto(`?tab=${value}`, { replaceState: true, keepFocus: true });
		} else {
			goto($page.url.pathname, { replaceState: true, keepFocus: true });
		}
	}

	// Billing-specific state
	let selectedOverageMode = $state<'pause' | 'auto_bill'>(data.subscription.overageMode);
	let updating = $state(false);

	const handleOverageModeSubmit: SubmitFunction = () => {
		updating = true;
		return async ({ result }) => {
			updating = false;
			if (result.type === 'success') {
				toast.success('Overage mode updated successfully');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error(result.data?.error || 'Failed to update overage mode');
				// Reset to current value on failure
				selectedOverageMode = data.subscription.overageMode;
			}
		};
	};

	const tierColors = {
		free: 'bg-gray-100 text-gray-800 border-gray-300',
		pro: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 border-purple-300',
		business: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-900 border-indigo-300'
	};

	const tierNames = {
		free: 'Free',
		pro: 'Pro',
		business: 'Business'
	};

	function formatDate(date: Date | null | undefined): string {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmNewPassword = $state('');
	let loading = $state(false);

	// 2FA State
	let twoFactorPassword = $state('');
	let twoFactorCode = $state('');
	let twoFactorLoading = $state(false);
	let showEnableDialog = $state(false);
	let showDisableDialog = $state(false);
	let qrCodeSetup = $state<{ qrCode: string; backupCodes: string[]; secret: string } | null>(null);
	let copiedBackupCodes = $state(false);
	let twoFactorPasswordError = $state('');

	// Account Deletion State
	let deletePassword = $state('');
	let deleteLoading = $state(false);
	let showDeleteDialog = $state(false);
	let deletePasswordError = $state('');

	// Track which fields have been touched
	let touched = $state({
		currentPassword: false,
		newPassword: false,
		confirmNewPassword: false
	});

	// Real-time validation errors
	const validationErrors = $derived({
		currentPassword: touched.currentPassword && !currentPassword.trim() ? 'Current password is required' : '',
		newPassword: touched.newPassword && newPassword.length > 0 && newPassword.length < 8
			? 'New password must be at least 8 characters'
			: touched.newPassword && newPassword === currentPassword && newPassword.length > 0
			? 'New password must be different from current password'
			: '',
		confirmNewPassword: touched.confirmNewPassword && confirmNewPassword.length > 0 && newPassword !== confirmNewPassword
			? 'Passwords do not match'
			: ''
	});

	// Calculate if form has changes (is dirty)
	const isDirty = $derived(
		currentPassword.trim() !== '' ||
		newPassword.trim() !== '' ||
		confirmNewPassword.trim() !== ''
	);

	// Check if form is valid for submission
	const isFormValid = $derived(
		currentPassword.trim() !== '' &&
		newPassword.length >= 8 &&
		newPassword !== currentPassword &&
		newPassword === confirmNewPassword
	);

	function handleBlur(field: keyof typeof touched) {
		touched[field] = true;
	}

	function handleSubmit({ cancel }: { cancel: () => void }) {
		// Mark all fields as touched on submit
		touched.currentPassword = true;
		touched.newPassword = true;
		touched.confirmNewPassword = true;

		// Prevent submission if form is invalid
		if (!isFormValid) {
			cancel();
			return;
		}

		loading = true;

		return async ({ result, update }: { result: any; update: () => Promise<void> }): Promise<void> => {
			loading = false;

			if (result.type === 'success') {
				toast.success('Password changed successfully', {
					duration: 3000
				});

				// Clear form and reset touched state
				currentPassword = '';
				newPassword = '';
				confirmNewPassword = '';
				touched.currentPassword = false;
				touched.newPassword = false;
				touched.confirmNewPassword = false;
			} else if (result.type === 'failure') {
				if (result.data?.error) {
					toast.error('Failed to change password', {
						description: result.data.error,
						duration: 4000
					});
				} else {
					toast.error('Failed to change password', {
						description: 'Please check the form for errors.',
						duration: 4000
					});
				}
			}

			// Apply default SvelteKit behavior (updates form prop)
			await update();
		};
	}

	// 2FA Handlers - Client-side (using Better Auth recommended API)
	async function handleEnableTwoFactor(e: Event): Promise<void> {
		e.preventDefault();
		twoFactorLoading = true;
		twoFactorPasswordError = '';

		try {
			// Step 1: Enable 2FA and get QR code
			// Pass issuer to ensure proper branding in authenticator apps
			const issuer = 'FormTrap';
			console.log('Client: Enabling 2FA with issuer:', issuer);

			const result = await twoFactor.enable({
				password: twoFactorPassword,
				issuer
			});

			console.log('Client: Enable result:', result);
			if (result.data) {
				console.log('Client: TOTP URI:', result.data.totpURI);
			}

			if (result.error) {
				// Check if it's a password error
				if (result.error.status === 401 || result.error.message?.toLowerCase().includes('password')) {
					twoFactorPasswordError = 'Incorrect password';
				} else {
					toast.error('Failed to enable 2FA', {
						description: result.error.message || 'Please try again.',
						duration: 4000
					});
				}
			} else if (result.data) {
				// The enable method returns the TOTP URI and backup codes
				// Modify the TOTP URI to show "FormTrap (email)" instead of just "email"
				let totpURI = result.data.totpURI || result.data.qrCode;

				// Parse and modify the URI to customize the account label
				// Format: otpauth://totp/Issuer:Account?secret=...&issuer=...
				// We want: otpauth://totp/FormTrap:FormTrap (email)?secret=...&issuer=FormTrap
				const url = new URL(totpURI);
				const pathParts = url.pathname.split(':');
				if (pathParts.length === 2) {
					const issuerPart = pathParts[0]; // "/FormTrap"
					const emailPart = decodeURIComponent(pathParts[1]); // "john@doe.com"
					const issuerName = issuerPart.substring(1); // Remove leading "/"

					// Create new label: "FormTrap (john@doe.com)"
					const newLabel = `${issuerName} (${emailPart})`;
					url.pathname = `${issuerPart}:${encodeURIComponent(newLabel)}`;
					totpURI = url.toString();

					console.log('Modified TOTP URI:', totpURI);
				}

				// Generate QR code from the modified TOTP URI
				const qrCodeDataURL = await QRCode.toDataURL(totpURI, {
					width: 256,
					margin: 2,
					color: {
						dark: '#000000',
						light: '#ffffff'
					}
				});

				qrCodeSetup = {
					qrCode: qrCodeDataURL,
					backupCodes: result.data.backupCodes || [],
					secret: result.data.secret || ''
				};
				twoFactorPassword = '';
				twoFactorPasswordError = '';
			}
		} catch (error: any) {
			logger.error('Enable 2FA error:', error);
			toast.error('Failed to enable 2FA', {
				description: 'Please try again.',
				duration: 4000
			});
		} finally {
			twoFactorLoading = false;
		}
	}

	async function handleVerifySetup(e: Event): Promise<void> {
		e.preventDefault();
		twoFactorLoading = true;

		try {
			// Step 2: Verify TOTP code
			const result = await twoFactor.verifyTotp({
				code: twoFactorCode,
				trustDevice: false
			});

			if (result.error) {
				toast.error('Failed to verify code', {
					description: result.error.message || 'Invalid verification code.',
					duration: 4000
				});
			} else {
				toast.success('2FA enabled successfully', {
					description: 'Your account is now protected with two-factor authentication.',
					duration: 4000
				});
				qrCodeSetup = null;
				twoFactorCode = '';
				showEnableDialog = false;
				await invalidateAll();
			}
		} catch (error: any) {
			logger.error('Verify 2FA error:', error);
			toast.error('Failed to verify code', {
				description: 'Please try again.',
				duration: 4000
			});
		} finally {
			twoFactorLoading = false;
		}
	}

	async function handleDisableTwoFactor(e: Event): Promise<void> {
		e.preventDefault();
		twoFactorLoading = true;
		twoFactorPasswordError = '';

		try {
			const result = await twoFactor.disable({ password: twoFactorPassword });

			if (result.error) {
				logger.error('Disable 2FA error:', result.error);
				// Check if it's a password error
				if (result.error.status === 401 || result.error.message?.toLowerCase().includes('password')) {
					twoFactorPasswordError = 'Incorrect password';
				} else {
					toast.error('Failed to disable 2FA', {
						description: result.error.message || 'Please try again.',
						duration: 4000
					});
				}
			} else {
				toast.success('2FA disabled successfully', {
					description: 'Two-factor authentication has been disabled.',
					duration: 3000
				});
				twoFactorPassword = '';
				twoFactorPasswordError = '';
				showDisableDialog = false;
				await invalidateAll();
			}
		} catch (error: any) {
			console.error('Disable 2FA error:', error);
			toast.error('Failed to disable 2FA', {
				description: 'Please try again.',
				duration: 4000
			});
		} finally {
			twoFactorLoading = false;
		}
	}

	function copyBackupCodes() {
		if (qrCodeSetup?.backupCodes) {
			navigator.clipboard.writeText(qrCodeSetup.backupCodes.join('\n'));
			copiedBackupCodes = true;
			setTimeout(() => copiedBackupCodes = false, 2000);
		}
	}

	function handleDeleteAccount() {
		deleteLoading = true;
		deletePasswordError = '';

		return async ({ result, update }: any) => {
			deleteLoading = false;

			if (result.type === 'failure') {
				deletePasswordError = result.data?.error || 'Failed to delete account';
			} else if (result.type === 'error') {
				toast.error('Failed to delete account', {
					description: 'Please try again.',
					duration: 4000
				});
			} else if (result.type === 'redirect') {
				// Manually navigate to the redirect location
				window.location.href = result.location;
				return;
			}

			// Apply default SvelteKit behavior for other result types
			await update();
		};
	}

	// Clean up when dialogs close
	$effect(() => {
		if (!showEnableDialog && !showDisableDialog) {
			twoFactorPassword = '';
			twoFactorPasswordError = '';
		}
		if (!showDeleteDialog) {
			deletePassword = '';
			deletePasswordError = '';
		}
	});
</script>

<div class="max-w-3xl mx-auto space-y-6">
	<PageIntro
		title="Settings"
		description="Manage your account settings and preferences"
	/>

	<Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
		<Tabs.List variant="important" class="mb-6">
			<Tabs.Trigger value="account">Account</Tabs.Trigger>
			<Tabs.Trigger value="billing">Billing</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="account" class="space-y-6">
			<Card.Root>
			<Card.Header>
				<Card.Title>Change Password</Card.Title>
				<Card.Description>Update your password to keep your account secure</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" action="?/changePassword" use:enhance={handleSubmit}>
					<div class="space-y-6">
						<!-- Current Password Field -->
						<div class="space-y-2">
							<Label for="currentPassword">Current Password</Label>
							<Input
								id="currentPassword"
								name="currentPassword"
								type="password"
								bind:value={currentPassword}
								onblur={() => handleBlur('currentPassword')}
								placeholder="Enter your current password"
								disabled={loading}
								required
								aria-invalid={validationErrors.currentPassword || form?.errors?.currentPassword ? true : undefined}
							/>
							{#if validationErrors.currentPassword}
								<p class="text-sm text-destructive">{validationErrors.currentPassword}</p>
							{:else if form?.errors?.currentPassword}
								<p class="text-sm text-destructive">{form.errors.currentPassword}</p>
							{/if}
						</div>

						<!-- New Password Field -->
						<div class="space-y-2">
							<Label for="newPassword">New Password</Label>
							<Input
								id="newPassword"
								name="newPassword"
								type="password"
								bind:value={newPassword}
								onblur={() => handleBlur('newPassword')}
								placeholder="Enter your new password (min 8 characters)"
								disabled={loading}
								required
								aria-invalid={validationErrors.newPassword || form?.errors?.newPassword ? true : undefined}
							/>
							{#if validationErrors.newPassword}
								<p class="text-sm text-destructive">{validationErrors.newPassword}</p>
							{:else if form?.errors?.newPassword}
								<p class="text-sm text-destructive">{form.errors.newPassword}</p>
							{/if}
						</div>

						<!-- Confirm New Password Field -->
						<div class="space-y-2">
							<Label for="confirmNewPassword">Confirm New Password</Label>
							<Input
								id="confirmNewPassword"
								name="confirmNewPassword"
								type="password"
								bind:value={confirmNewPassword}
								onblur={() => handleBlur('confirmNewPassword')}
								placeholder="Confirm your new password"
								disabled={loading}
								required
								aria-invalid={validationErrors.confirmNewPassword || form?.errors?.confirmNewPassword ? true : undefined}
							/>
							{#if validationErrors.confirmNewPassword}
								<p class="text-sm text-destructive">{validationErrors.confirmNewPassword}</p>
							{:else if form?.errors?.confirmNewPassword}
								<p class="text-sm text-destructive">{form.errors.confirmNewPassword}</p>
							{/if}
						</div>
					</div>

					<!-- Submit Button -->
					<div class="flex justify-end mt-6">
						<Button variant="fancy" tracking type="submit" disabled={!isDirty || loading}>
							{loading ? 'Changing Password...' : 'Change Password'}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Two-Factor Authentication Card -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					{#if data.twoFactorEnabled}
						<ShieldCheck class="h-5 w-5 text-green-600" />
					{:else}
						<Shield class="h-5 w-5 text-muted-foreground" />
					{/if}
					<div>
						<Card.Title>Two-Factor Authentication</Card.Title>
						<Card.Description>
							{#if data.twoFactorEnabled}
								Your account is protected with 2FA
							{:else}
								Add an extra layer of security to your account
							{/if}
						</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<p class="text-sm text-muted-foreground">
						{#if data.twoFactorEnabled}
							Two-factor authentication is currently enabled. You'll need to enter a code from your authenticator app when signing in.
						{:else}
							Enable two-factor authentication to protect your account with a code from your authenticator app (like Google Authenticator, Authy, or 1Password) in addition to your password.
						{/if}
					</p>

					{#if data.twoFactorEnabled}
						<Button variant="destructive" onclick={() => showDisableDialog = true}>
							Disable 2FA
						</Button>
					{:else}
						<EmeraldButton variant="light" onclick={() => showEnableDialog = true}>
							Enable 2FA
						</EmeraldButton>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Danger Zone Card -->
		<Card.Root class="border-destructive/50">
			<Card.Header>
				<Card.Title class="text-destructive">Danger Zone</Card.Title>
				<Card.Description>
					Irreversible and destructive actions
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
						<h3 class="font-semibold text-sm mb-2">Delete Account</h3>
						<p class="text-sm text-muted-foreground mb-4">
							Once you delete your account, there is no going back. This will permanently delete your account, profile data, and all associated content.
						</p>
						<ul class="text-sm text-muted-foreground space-y-1 mb-4">
							<li>• All your personal data will be deleted</li>
							<li>• Your profile image and uploads will be removed</li>
							<li>• All sessions will be terminated</li>
							<li>• This action cannot be undone</li>
						</ul>
						<Button variant="destructive" onclick={() => showDeleteDialog = true}>
							Delete My Account
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="billing" class="space-y-6">
			<!-- Current Plan -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Current Plan</Card.Title>
					<Card.Description>Your active subscription tier</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-4">
							<Badge
								variant="outline"
								class="flex items-center gap-2 px-4 py-2 text-lg font-semibold {tierColors[
									data.subscription.tier
								]}"
							>
								{#if data.subscription.tier === 'free'}
									<TrendingUp class="h-5 w-5" />
								{:else}
									<Crown class="h-5 w-5" />
								{/if}
								{tierNames[data.subscription.tier]} Plan
							</Badge>
							<Badge variant={data.subscription.status === 'active' ? 'default' : 'destructive'}>
								{data.subscription.status}
							</Badge>
						</div>
						<Button href="/pricing" variant="default">
							{data.subscription.tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
						</Button>
					</div>

					{#if data.subscription.currentPeriodStart && data.subscription.currentPeriodEnd}
						<div class="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
							<Calendar class="h-4 w-4" />
							<span>
								Current period: {formatDate(data.subscription.currentPeriodStart)} - {formatDate(
									data.subscription.currentPeriodEnd
								)}
							</span>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Overage Settings (Pro/Business only) -->
			{#if data.subscription.tier !== 'free'}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<Settings class="h-5 w-5" />
							Overage Handling
						</Card.Title>
						<Card.Description>
							How to handle submissions when you exceed your monthly limit
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<form method="POST" action="?/updateOverageMode" use:enhance={handleOverageModeSubmit}>
							<div class="space-y-6">
								<!-- Radio Buttons for Overage Mode -->
								<div class="space-y-3">
									<label class="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors {selectedOverageMode === 'pause' ? 'border-primary bg-muted/30' : ''}">
										<input
											type="radio"
											name="overageMode"
											value="pause"
											bind:group={selectedOverageMode}
											disabled={updating}
											class="mt-1"
										/>
										<div class="flex-1">
											<p class="font-medium">Pause Forms</p>
											<p class="text-muted-foreground text-sm mt-1">
												Forms automatically stop accepting submissions when you hit your limit. Users can still view forms but submissions will be rejected with a friendly message.
											</p>
										</div>
									</label>

									<label class="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors {selectedOverageMode === 'auto_bill' ? 'border-primary bg-muted/30' : ''}">
										<input
											type="radio"
											name="overageMode"
											value="auto_bill"
											bind:group={selectedOverageMode}
											disabled={updating}
											class="mt-1"
										/>
										<div class="flex-1">
											<p class="font-medium">Auto-Bill Overages</p>
											<p class="text-muted-foreground text-sm mt-1">
												Forms continue working seamlessly. You'll be charged for overages at the end of your billing cycle.
											</p>
										</div>
									</label>
								</div>

								<!-- Pricing Info -->
								<div class="rounded-lg bg-muted p-4">
									<p class="text-sm font-medium mb-2">Overage Pricing</p>
									<ul class="text-muted-foreground text-sm space-y-1">
										<li>• $10 per 1,000 submissions</li>
										<li>• $5 per 5GB storage</li>
									</ul>
								</div>

								<!-- Submit Button -->
								<div class="flex justify-end">
									<Button type="submit" disabled={updating || selectedOverageMode === data.subscription.overageMode}>
										{updating ? 'Saving...' : 'Save Changes'}
									</Button>
								</div>
							</div>
						</form>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Payment & Billing Portal -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<CreditCard class="h-5 w-5" />
						Payment & Billing
					</Card.Title>
					<Card.Description>
						Manage payment methods, view invoices, and update billing information
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#if data.subscription.paymentProvider}
							<div class="rounded-lg border p-4">
								<p class="text-sm">
									<span class="text-muted-foreground">Payment Provider:</span>
									<span class="ml-2 font-medium capitalize">{data.subscription.paymentProvider}</span>
								</p>
								{#if data.subscription.billingCycle}
									<p class="text-muted-foreground mt-1 text-sm">
										Billing Cycle: {data.subscription.billingCycle === 'monthly'
											? 'Monthly'
											: 'Annual'}
									</p>
								{/if}
							</div>
						{/if}

						<div class="rounded-lg border border-dashed p-6 text-center">
							<p class="text-muted-foreground mb-3 text-sm">
								Access your billing portal to manage payment methods, view invoices, and update billing
								information
							</p>
							<Button variant="outline" disabled>
								Open Billing Portal
								<span class="ml-2 text-muted-foreground text-xs">(Coming Soon)</span>
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Quick Actions -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Quick Actions</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-wrap gap-3">
						<Button variant="outline" href="/usage">View Usage & Limits</Button>
						<Button variant="outline" href="/pricing">Compare Plans</Button>
						{#if data.subscription.tier !== 'free'}
							<Button variant="outline" href="/usage/allocate">Manage Resource Allocations</Button>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Enable 2FA Dialog -->
<Dialog.Root bind:open={showEnableDialog}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Enable Two-Factor Authentication</Dialog.Title>
			<Dialog.Description>
				{#if !qrCodeSetup}
					Enter your password to generate your 2FA setup code
				{:else}
					Scan the QR code with your authenticator app
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if !qrCodeSetup}
			<!-- Step 1: Password Verification -->
			<form onsubmit={handleEnableTwoFactor}>
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="twoFactorPassword">Password</Label>
						<Input
							id="twoFactorPassword"
							name="password"
							type="password"
							bind:value={twoFactorPassword}
							oninput={() => twoFactorPasswordError = ''}
							placeholder="Enter your password"
							disabled={twoFactorLoading}
							required
							autocomplete="off"
							data-1p-ignore
							data-lpignore="true"
							aria-invalid={twoFactorPasswordError ? true : undefined}
						/>
						{#if twoFactorPasswordError}
							<p class="text-sm text-destructive">{twoFactorPasswordError}</p>
						{/if}
					</div>
				</div>
				<Dialog.Footer class="mt-6">
					<Button type="button" variant="outline" onclick={() => {
						showEnableDialog = false;
						twoFactorPassword = '';
						twoFactorPasswordError = '';
					}}>
						Cancel
					</Button>
					<EmeraldButton variant="light" type="submit" disabled={twoFactorLoading || !twoFactorPassword}>
						{twoFactorLoading ? 'Generating...' : 'Continue'}
					</EmeraldButton>
				</Dialog.Footer>
			</form>
		{:else}
			<!-- Step 2: QR Code & Verification -->
			<div class="space-y-6">
				<!-- QR Code -->
				<div class="flex justify-center">
					<div class="p-4 bg-white rounded-lg">
						<img src={qrCodeSetup.qrCode} alt="2FA QR Code" class="w-64 h-64" />
					</div>
				</div>

				<!-- Backup Codes -->
				<div class="space-y-2">
					<div>
						<Label>Backup Codes</Label>
					</div>
					<div class="relative p-3 bg-muted rounded-md text-sm font-mono space-y-1">
						<button
							type="button"
							onclick={copyBackupCodes}
							class="absolute top-2 right-2 p-1.5 hover:bg-background rounded-md transition-colors"
							aria-label="Copy all backup codes"
						>
							{#if copiedBackupCodes}
								<Check class="h-4 w-4 text-green-600" />
							{:else}
								<Copy class="h-4 w-4 text-muted-foreground" />
							{/if}
						</button>
						{#each qrCodeSetup.backupCodes as code}
							<div>{code}</div>
						{/each}
					</div>
					<p class="text-xs text-muted-foreground">
						Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator app.
					</p>
				</div>

				<!-- Verification -->
				<form onsubmit={handleVerifySetup}>
					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="twoFactorCode">Verification Code</Label>
							<Input
								id="twoFactorCode"
								name="code"
								type="text"
								bind:value={twoFactorCode}
								placeholder="Enter 6-digit code"
								maxlength={6}
								disabled={twoFactorLoading}
								required
							/>
							<p class="text-xs text-muted-foreground">
								Enter the 6-digit code from your authenticator app
							</p>
						</div>
					</div>
					<Dialog.Footer class="mt-6">
						<Button type="button" variant="outline" onclick={() => {
							qrCodeSetup = null;
							twoFactorCode = '';
						}}>
							Back
						</Button>
						<EmeraldButton variant="light" type="submit" disabled={twoFactorLoading || twoFactorCode.length !== 6}>
							{twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
						</EmeraldButton>
					</Dialog.Footer>
				</form>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Disable 2FA Dialog -->
<Dialog.Root bind:open={showDisableDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Disable Two-Factor Authentication</Dialog.Title>
			<Dialog.Description>
				Enter your password to disable two-factor authentication
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleDisableTwoFactor}>
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="disableTwoFactorPassword">Password</Label>
					<Input
						id="disableTwoFactorPassword"
						name="password"
						type="password"
						bind:value={twoFactorPassword}
						oninput={() => twoFactorPasswordError = ''}
						placeholder="Enter your password"
						disabled={twoFactorLoading}
						required
						aria-invalid={twoFactorPasswordError ? true : undefined}
					/>
					{#if twoFactorPasswordError}
						<p class="text-sm text-destructive">{twoFactorPasswordError}</p>
					{/if}
				</div>
			</div>
			<Dialog.Footer class="mt-6">
				<Button type="button" variant="outline" onclick={() => {
					showDisableDialog = false;
					twoFactorPassword = '';
					twoFactorPasswordError = '';
				}}>
					Cancel
				</Button>
				<Button variant="destructive" type="submit" disabled={twoFactorLoading || !twoFactorPassword}>
					{twoFactorLoading ? 'Disabling...' : 'Disable 2FA'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Account Dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="text-destructive">Delete Account</Dialog.Title>
			<Dialog.Description>
				This action is permanent and cannot be undone
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/deleteAccount" use:enhance={handleDeleteAccount}>
			<div class="space-y-4">
				<div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
					<p class="text-sm font-semibold text-destructive mb-2">
						⚠️ Warning: This will permanently delete:
					</p>
					<ul class="text-sm space-y-1">
						<li>• Your account and profile</li>
						<li>• All your data and uploads</li>
						<li>• All active sessions</li>
						<li>• Your two-factor authentication settings</li>
					</ul>
				</div>

				<div class="space-y-2">
					<Label for="deletePassword">Confirm your password to continue</Label>
					<Input
						id="deletePassword"
						name="password"
						type="password"
						bind:value={deletePassword}
						oninput={() => deletePasswordError = ''}
						placeholder="Enter your password"
						disabled={deleteLoading}
						required
						autocomplete="off"
						data-1p-ignore
						data-lpignore="true"
						aria-invalid={deletePasswordError ? true : undefined}
					/>
					{#if deletePasswordError}
						<p class="text-sm text-destructive">{deletePasswordError}</p>
					{/if}
				</div>

				<p class="text-sm text-muted-foreground">
					Are you absolutely sure? This action cannot be undone.
				</p>
			</div>
			<Dialog.Footer class="mt-6">
				<Button type="button" variant="outline" onclick={() => {
					showDeleteDialog = false;
					deletePassword = '';
					deletePasswordError = '';
				}}>
					Cancel
				</Button>
				<Button variant="destructive" type="submit" disabled={deleteLoading || !deletePassword}>
					{deleteLoading ? 'Deleting Account...' : 'Yes, Delete My Account'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
