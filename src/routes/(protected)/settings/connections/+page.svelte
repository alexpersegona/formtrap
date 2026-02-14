<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Database,
		HardDrive,
		Shield,
		TableProperties,
		Mail,
		Loader2,
		CheckCircle2,
		XCircle,
		AlertCircle,
		Unplug
	} from '@lucide/svelte';

	let { data } = $props();

	// Tab state from URL query param
	let activeTab = $derived($page.url.searchParams.get('tab') || 'database');

	// Update URL when tab changes (client-side only, no page reload)
	function handleTabChange(value: string | undefined) {
		if (value && value !== 'database') {
			goto(`?tab=${value}`, { replaceState: true, keepFocus: true });
		} else {
			goto($page.url.pathname, { replaceState: true, keepFocus: true });
		}
	}

	let dbLoading = $state(false);
	let storageLoading = $state(false);
	let spamLoading = $state(false);
	let emailLoading = $state(false);
	let schemaLoading = $state(false);
	let testDbLoading = $state(false);
	let testStorageLoading = $state(false);
	let testEmailLoading = $state(false);
	let disconnectLoading = $state(false);

	// Form values
	let dbProvider = $state(data.connection?.dbProvider || 'neon');
	let connectionString = $state('');
	let storageProvider = $state(data.connection?.storageProvider || 'cloudflare_r2');
	let storageEndpoint = $state('');
	let storageAccessKeyId = $state('');
	let storageSecretAccessKey = $state('');
	let storageBucket = $state('');
	let storagePublicUrl = $state('');
	let storageRegion = $state('auto');
	let spamProvider = $state(data.connection?.spamProvider || 'honeypot');
	let spamSiteKey = $state(data.connection?.spamSiteKey || '');
	let spamSecretKey = $state('');

	// Email form values
	let emailProvider = $state(data.connection?.emailProvider || 'smtp');
	let emailFromEmail = $state('');
	let emailFromName = $state('');
	// SMTP fields
	let smtpHost = $state('');
	let smtpPort = $state('587');
	let smtpUsername = $state('');
	let smtpPassword = $state('');
	let smtpSecure = $state(false);
	// API-based providers
	let emailApiKey = $state('');
	let mailgunDomain = $state('');
	// AWS SES
	let sesAccessKeyId = $state('');
	let sesSecretAccessKey = $state('');
	let sesRegion = $state('us-east-1');

	let dbBadge = $derived(statusBadge(data.connection?.dbStatus));
	let storageBadge = $derived(statusBadge(data.connection?.storageStatus));
	let emailBadge = $derived(statusBadge(data.connection?.emailStatus));

	const dbProviders = [
		{ value: 'neon', label: 'Neon' },
		{ value: 'supabase', label: 'Supabase' },
		{ value: 'railway', label: 'Railway' },
		{ value: 'custom', label: 'Custom' }
	];

	const storageProviders = [
		{ value: 'cloudflare_r2', label: 'Cloudflare R2' },
		{ value: 'aws_s3', label: 'AWS S3' },
		{ value: 'backblaze_b2', label: 'Backblaze B2' }
	];

	const spamProviders = [
		{ value: 'honeypot', label: 'Honeypot Only' },
		{ value: 'turnstile', label: 'Cloudflare Turnstile' },
		{ value: 'recaptcha', label: 'Google reCAPTCHA' },
		{ value: 'hcaptcha', label: 'hCaptcha' }
	];

	const emailProviders = [
		{ value: 'smtp', label: 'SMTP' },
		{ value: 'sendgrid', label: 'SendGrid' },
		{ value: 'resend', label: 'Resend' },
		{ value: 'mailgun', label: 'Mailgun' },
		{ value: 'aws_ses', label: 'AWS SES' }
	];

	function statusBadge(status: string | undefined) {
		if (status === 'connected') return { variant: 'default' as const, label: 'Connected', class: 'bg-green-600' };
		if (status === 'error') return { variant: 'destructive' as const, label: 'Error', class: '' };
		return { variant: 'secondary' as const, label: 'Disconnected', class: '' };
	}

	const handleDbSubmit: SubmitFunction = () => {
		dbLoading = true;
		return async ({ result, update }) => {
			dbLoading = false;
			if (result.type === 'success') {
				toast.success('Database connected successfully');
				connectionString = '';
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.dbError || 'Failed to connect database');
			}
		};
	};

	const handleStorageSubmit: SubmitFunction = () => {
		storageLoading = true;
		return async ({ result, update }) => {
			storageLoading = false;
			if (result.type === 'success') {
				toast.success('Storage connected successfully');
				storageSecretAccessKey = '';
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.storageError || 'Failed to connect storage');
			}
		};
	};

	const handleSpamSubmit: SubmitFunction = () => {
		spamLoading = true;
		return async ({ result, update }) => {
			spamLoading = false;
			if (result.type === 'success') {
				toast.success('Spam protection updated');
				spamSecretKey = '';
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.spamError || 'Failed to save spam settings');
			}
		};
	};

	const handleEmailSubmit: SubmitFunction = () => {
		emailLoading = true;
		return async ({ result, update }) => {
			emailLoading = false;
			if (result.type === 'success') {
				toast.success('Email provider connected! A test email was sent to your profile email.');
				// Clear sensitive fields
				smtpPassword = '';
				emailApiKey = '';
				sesSecretAccessKey = '';
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.emailError || 'Failed to connect email provider');
			}
		};
	};

	const handleTestEmail: SubmitFunction = () => {
		testEmailLoading = true;
		return async ({ result, update }) => {
			testEmailLoading = false;
			if (result.type === 'success') {
				toast.success('Email connection is healthy. Test email sent to your profile email.');
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.emailError || 'Email test failed');
				await update();
			}
		};
	};

	const handleSchemaInit: SubmitFunction = () => {
		schemaLoading = true;
		return async ({ result, update }) => {
			schemaLoading = false;
			if (result.type === 'success') {
				toast.success('Schema initialized in your database');
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.schemaError || 'Failed to initialize schema');
			}
		};
	};

	const handleTestDb: SubmitFunction = () => {
		testDbLoading = true;
		return async ({ result, update }) => {
			testDbLoading = false;
			if (result.type === 'success') {
				toast.success('Database connection is healthy');
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.dbError || 'Database test failed');
				await update();
			}
		};
	};

	const handleTestStorage: SubmitFunction = () => {
		testStorageLoading = true;
		return async ({ result, update }) => {
			testStorageLoading = false;
			if (result.type === 'success') {
				toast.success('Storage connection is healthy');
				await update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.storageError || 'Storage test failed');
				await update();
			}
		};
	};

	const handleDisconnect: SubmitFunction = () => {
		disconnectLoading = true;
		return async ({ result, update }) => {
			disconnectLoading = false;
			if (result.type === 'success') {
				toast.success('Disconnected successfully');
				await update();
			} else if (result.type === 'failure') {
				toast.error('Failed to disconnect');
			}
		};
	};
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-bold tracking-tight">Infrastructure Connections</h2>
		<p class="text-muted-foreground">
			Connect your own database and storage to use FormTrap with unlimited forms and submissions.
		</p>
	</div>

	<Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
		<Tabs.List variant="important" class="mb-6">
			<Tabs.Trigger value="database">Database</Tabs.Trigger>
			<Tabs.Trigger value="storage">File Storage</Tabs.Trigger>
			<Tabs.Trigger value="spam">Spam Protection</Tabs.Trigger>
			<Tabs.Trigger value="email">Email</Tabs.Trigger>
		</Tabs.List>

		<!-- Database Tab -->
		<Tabs.Content value="database" class="space-y-6">
			<!-- Database Connection -->
			<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Database class="h-5 w-5" />
					<Card.Title>Database</Card.Title>
				</div>
				<Badge variant={dbBadge.variant} class={dbBadge.class}>{dbBadge.label}</Badge>
			</div>
			<Card.Description>
				Connect your PostgreSQL database to store forms and submissions.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.connection?.dbStatus === 'connected'}
				<div class="space-y-4">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<CheckCircle2 class="h-4 w-4 text-green-600" />
						<span>Connected to {data.connection.dbProvider || 'PostgreSQL'}</span>
						{#if data.connection.dbLastCheckedAt}
							<span class="text-xs">
								(last checked {new Date(data.connection.dbLastCheckedAt).toLocaleString()})
							</span>
						{/if}
					</div>

					{#if data.connection.dbError}
						<div class="flex items-center gap-2 text-sm text-destructive">
							<AlertCircle class="h-4 w-4" />
							<span>{data.connection.dbError}</span>
						</div>
					{/if}

					<div class="flex gap-2">
						<form method="POST" action="?/testDatabase" use:enhance={handleTestDb}>
							<Button variant="outline" size="sm" disabled={testDbLoading}>
								{#if testDbLoading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Test Connection
							</Button>
						</form>

						<form method="POST" action="?/disconnect" use:enhance={handleDisconnect}>
							<input type="hidden" name="type" value="database" />
							<Button variant="ghost" size="sm" disabled={disconnectLoading} class="text-destructive">
								<Unplug class="mr-2 h-4 w-4" />
								Disconnect
							</Button>
						</form>
					</div>
				</div>
			{:else}
				<form method="POST" action="?/saveDatabase" use:enhance={handleDbSubmit} class="space-y-4">
					<div class="space-y-2">
						<Label for="dbProvider">Provider</Label>
						<input type="hidden" name="dbProvider" value={dbProvider} />
						<Select.Root type="single" bind:value={dbProvider}>
							<Select.Trigger id="dbProvider" class="w-full">
								{dbProviders.find(p => p.value === dbProvider)?.label || 'Select provider'}
							</Select.Trigger>
							<Select.Content>
								{#each dbProviders as provider}
									<Select.Item value={provider.value}>{provider.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<Label for="connectionString">Connection String</Label>
						<Input
							id="connectionString"
							name="connectionString"
							type="password"
							placeholder="postgres://user:password@host:5432/dbname"
							bind:value={connectionString}
						/>
						<p class="text-xs text-muted-foreground">
							Your connection string is encrypted at rest using AES-256-GCM.
						</p>
					</div>

					<Button type="submit" disabled={dbLoading || !connectionString}>
						{#if dbLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Test & Save
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>

			<!-- Schema Initialization (part of Database tab) -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<TableProperties class="h-5 w-5" />
							<Card.Title>Database Schema</Card.Title>
						</div>
						{#if data.connection?.schemaInitialized}
							<Badge variant="default" class="bg-green-600">Initialized (v{data.connection.schemaVersion})</Badge>
						{:else}
							<Badge variant="secondary">Not Initialized</Badge>
						{/if}
					</div>
					<Card.Description>
						Create the required tables in your database. This is needed before you can start using forms.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if data.connection?.schemaInitialized}
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<CheckCircle2 class="h-4 w-4 text-green-600" />
							<span>Schema v{data.connection.schemaVersion} is installed in your database.</span>
						</div>
					{:else}
						<form method="POST" action="?/initializeSchema" use:enhance={handleSchemaInit}>
							<div class="space-y-4">
								<p class="text-sm text-muted-foreground">
									This will create <code class="bg-muted px-1 rounded">form</code> and <code class="bg-muted px-1 rounded">submission</code> tables with the required indexes in your database.
								</p>
								<Button
									type="submit"
									disabled={schemaLoading || data.connection?.dbStatus !== 'connected'}
								>
									{#if schemaLoading}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{/if}
									Create Tables
								</Button>
								{#if data.connection?.dbStatus !== 'connected'}
									<p class="text-xs text-muted-foreground">Connect your database first.</p>
								{/if}
							</div>
						</form>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Storage Tab -->
		<Tabs.Content value="storage" class="space-y-6">
			<!-- Storage Connection -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<HardDrive class="h-5 w-5" />
					<Card.Title>File Storage</Card.Title>
				</div>
				<Badge variant={storageBadge.variant} class={storageBadge.class}>{storageBadge.label}</Badge>
			</div>
			<Card.Description>
				Connect S3-compatible storage for form file uploads.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.connection?.storageStatus === 'connected'}
				<div class="space-y-4">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<CheckCircle2 class="h-4 w-4 text-green-600" />
						<span>Connected to {data.connection.storageProvider || 'S3-compatible storage'}</span>
					</div>

					{#if data.connection.storageError}
						<div class="flex items-center gap-2 text-sm text-destructive">
							<AlertCircle class="h-4 w-4" />
							<span>{data.connection.storageError}</span>
						</div>
					{/if}

					<div class="flex gap-2">
						<form method="POST" action="?/testStorage" use:enhance={handleTestStorage}>
							<Button variant="outline" size="sm" disabled={testStorageLoading}>
								{#if testStorageLoading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Test Connection
							</Button>
						</form>

						<form method="POST" action="?/disconnect" use:enhance={handleDisconnect}>
							<input type="hidden" name="type" value="storage" />
							<Button variant="ghost" size="sm" disabled={disconnectLoading} class="text-destructive">
								<Unplug class="mr-2 h-4 w-4" />
								Disconnect
							</Button>
						</form>
					</div>
				</div>
			{:else}
				<form method="POST" action="?/saveStorage" use:enhance={handleStorageSubmit} class="space-y-4">
					<div class="space-y-2">
						<Label for="storageProvider">Provider</Label>
						<input type="hidden" name="storageProvider" value={storageProvider} />
						<Select.Root type="single" bind:value={storageProvider}>
							<Select.Trigger id="storageProvider" class="w-full">
								{storageProviders.find(p => p.value === storageProvider)?.label || 'Select provider'}
							</Select.Trigger>
							<Select.Content>
								{#each storageProviders as provider}
									<Select.Item value={provider.value}>{provider.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="endpoint">Endpoint URL</Label>
							<Input
								id="endpoint"
								name="endpoint"
								placeholder="https://account-id.r2.cloudflarestorage.com"
								bind:value={storageEndpoint}
							/>
						</div>
						<div class="space-y-2">
							<Label for="bucket">Bucket Name</Label>
							<Input
								id="bucket"
								name="bucket"
								placeholder="my-formtrap-bucket"
								bind:value={storageBucket}
							/>
						</div>
						<div class="space-y-2">
							<Label for="accessKeyId">Access Key ID</Label>
							<Input
								id="accessKeyId"
								name="accessKeyId"
								bind:value={storageAccessKeyId}
							/>
						</div>
						<div class="space-y-2">
							<Label for="secretAccessKey">Secret Access Key</Label>
							<Input
								id="secretAccessKey"
								name="secretAccessKey"
								type="password"
								bind:value={storageSecretAccessKey}
							/>
						</div>
						<div class="space-y-2">
							<Label for="publicUrl">Public URL (optional)</Label>
							<Input
								id="publicUrl"
								name="publicUrl"
								placeholder="https://files.example.com"
								bind:value={storagePublicUrl}
							/>
						</div>
						<div class="space-y-2">
							<Label for="region">Region</Label>
							<Input
								id="region"
								name="region"
								placeholder="auto"
								bind:value={storageRegion}
							/>
						</div>
					</div>

					<p class="text-xs text-muted-foreground">
						All credentials are encrypted at rest using AES-256-GCM.
					</p>

					<Button
						type="submit"
						disabled={storageLoading || !storageEndpoint || !storageBucket || !storageAccessKeyId || !storageSecretAccessKey}
					>
						{#if storageLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Test & Save
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
		</Tabs.Content>

		<!-- Spam Protection Tab -->
		<Tabs.Content value="spam" class="space-y-6">
			<!-- Spam Protection -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-2">
				<Shield class="h-5 w-5" />
				<Card.Title>Spam Protection</Card.Title>
			</div>
			<Card.Description>
				Configure CAPTCHA or honeypot for your forms. Honeypot is always active in addition to any CAPTCHA provider.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/saveSpamProtection" use:enhance={handleSpamSubmit} class="space-y-4">
				<div class="space-y-2">
					<Label for="spamProvider">Provider</Label>
					<input type="hidden" name="spamProvider" value={spamProvider} />
					<Select.Root type="single" bind:value={spamProvider}>
						<Select.Trigger id="spamProvider" class="w-full">
							{spamProviders.find(p => p.value === spamProvider)?.label || 'Select provider'}
						</Select.Trigger>
						<Select.Content>
							{#each spamProviders as provider}
								<Select.Item value={provider.value}>{provider.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				{#if spamProvider !== 'honeypot'}
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="siteKey">Site Key</Label>
							<Input
								id="siteKey"
								name="siteKey"
								bind:value={spamSiteKey}
							/>
						</div>
						<div class="space-y-2">
							<Label for="secretKey">Secret Key</Label>
							<Input
								id="secretKey"
								name="secretKey"
								type="password"
								bind:value={spamSecretKey}
								placeholder={data.connection?.spamSiteKey ? '(unchanged)' : ''}
							/>
						</div>
					</div>
				{/if}

				<Button type="submit" disabled={spamLoading}>
					{#if spamLoading}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
		</Tabs.Content>

		<!-- Email Tab -->
		<Tabs.Content value="email" class="space-y-6">
			<!-- Email Provider -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Mail class="h-5 w-5" />
					<Card.Title>Email Provider</Card.Title>
				</div>
				<Badge variant={emailBadge.variant} class={emailBadge.class}>{emailBadge.label}</Badge>
			</div>
			<Card.Description>
				Configure your own email provider for form submission notifications. Without a BYO provider, FormTrap's Mailgun is used (limited to 1,000 emails/month).
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.connection?.emailStatus === 'connected'}
				<div class="space-y-4">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<CheckCircle2 class="h-4 w-4 text-green-600" />
						<span>Connected via {data.connection.emailProvider?.toUpperCase() || 'Email provider'}</span>
						{#if data.connection.emailLastCheckedAt}
							<span class="text-xs">
								(last checked {new Date(data.connection.emailLastCheckedAt).toLocaleString()})
							</span>
						{/if}
					</div>

					{#if data.connection.emailError}
						<div class="flex items-center gap-2 text-sm text-destructive">
							<AlertCircle class="h-4 w-4" />
							<span>{data.connection.emailError}</span>
						</div>
					{/if}

					<div class="flex gap-2">
						<form method="POST" action="?/testEmail" use:enhance={handleTestEmail}>
							<Button variant="outline" size="sm" disabled={testEmailLoading}>
								{#if testEmailLoading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Test Connection
							</Button>
						</form>

						<form method="POST" action="?/disconnect" use:enhance={handleDisconnect}>
							<input type="hidden" name="type" value="email" />
							<Button variant="ghost" size="sm" disabled={disconnectLoading} class="text-destructive">
								<Unplug class="mr-2 h-4 w-4" />
								Disconnect
							</Button>
						</form>
					</div>
				</div>
			{:else}
				<form method="POST" action="?/saveEmail" use:enhance={handleEmailSubmit} class="space-y-4">
					<div class="space-y-2">
						<Label for="emailProvider">Provider</Label>
						<input type="hidden" name="emailProvider" value={emailProvider} />
						<Select.Root type="single" bind:value={emailProvider}>
							<Select.Trigger id="emailProvider" class="w-full">
								{emailProviders.find(p => p.value === emailProvider)?.label || 'Select provider'}
							</Select.Trigger>
							<Select.Content>
								{#each emailProviders as provider}
									<Select.Item value={provider.value}>{provider.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="fromEmail">From Email</Label>
							<Input
								id="fromEmail"
								name="fromEmail"
								type="email"
								placeholder="noreply@yourdomain.com"
								bind:value={emailFromEmail}
							/>
						</div>
						<div class="space-y-2">
							<Label for="fromName">From Name (optional)</Label>
							<Input
								id="fromName"
								name="fromName"
								placeholder="FormTrap Notifications"
								bind:value={emailFromName}
							/>
						</div>
					</div>

					{#if emailProvider === 'smtp'}
						<!-- SMTP Fields -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="host">SMTP Host</Label>
								<Input
									id="host"
									name="host"
									placeholder="smtp.example.com"
									bind:value={smtpHost}
								/>
							</div>
							<div class="space-y-2">
								<Label for="port">Port</Label>
								<Input
									id="port"
									name="port"
									type="number"
									placeholder="587"
									bind:value={smtpPort}
								/>
							</div>
							<div class="space-y-2">
								<Label for="username">Username</Label>
								<Input
									id="username"
									name="username"
									bind:value={smtpUsername}
								/>
							</div>
							<div class="space-y-2">
								<Label for="password">Password</Label>
								<Input
									id="password"
									name="password"
									type="password"
									bind:value={smtpPassword}
								/>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="secure"
								name="secure"
								value="true"
								bind:checked={smtpSecure}
								class="h-4 w-4 rounded border-input"
							/>
							<Label for="secure" class="text-sm font-normal">Use TLS (port 465)</Label>
						</div>
					{:else if emailProvider === 'mailgun'}
						<!-- Mailgun Fields -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="apiKey">API Key</Label>
								<Input
									id="apiKey"
									name="apiKey"
									type="password"
									bind:value={emailApiKey}
								/>
							</div>
							<div class="space-y-2">
								<Label for="domain">Domain</Label>
								<Input
									id="domain"
									name="domain"
									placeholder="mg.yourdomain.com"
									bind:value={mailgunDomain}
								/>
							</div>
						</div>
					{:else if emailProvider === 'aws_ses'}
						<!-- AWS SES Fields -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="accessKeyId">Access Key ID</Label>
								<Input
									id="accessKeyId"
									name="accessKeyId"
									bind:value={sesAccessKeyId}
								/>
							</div>
							<div class="space-y-2">
								<Label for="secretAccessKey">Secret Access Key</Label>
								<Input
									id="secretAccessKey"
									name="secretAccessKey"
									type="password"
									bind:value={sesSecretAccessKey}
								/>
							</div>
							<div class="space-y-2">
								<Label for="region">Region</Label>
								<Input
									id="region"
									name="region"
									placeholder="us-east-1"
									bind:value={sesRegion}
								/>
							</div>
						</div>
					{:else}
						<!-- SendGrid / Resend - just API key -->
						<div class="space-y-2">
							<Label for="apiKey">API Key</Label>
							<Input
								id="apiKey"
								name="apiKey"
								type="password"
								bind:value={emailApiKey}
							/>
						</div>
					{/if}

					<p class="text-xs text-muted-foreground">
						A test email will be sent to <strong>{data.user?.email}</strong> to verify your configuration.
					</p>

					<Button type="submit" disabled={emailLoading || !emailFromEmail}>
						{#if emailLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Test & Save
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
