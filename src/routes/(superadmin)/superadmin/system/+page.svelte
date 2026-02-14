<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import {
		Database,
		Server,
		CheckCircle,
		XCircle,
		Key,
		Shield,
		Mail,
		Globe
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">System Health</h1>
		<p class="text-muted-foreground">Monitor system status and configuration</p>
	</div>

	<!-- Status Cards -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Database Status -->
		<Card class="p-6">
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-3">
					<div
						class="h-12 w-12 rounded-full flex items-center justify-center
						{data.database.status === 'connected' ? 'bg-green-500/10' : 'bg-red-500/10'}"
					>
						<Database
							class="h-6 w-6 {data.database.status === 'connected'
								? 'text-green-500'
								: 'text-red-500'}"
						/>
					</div>
					<div>
						<h3 class="text-lg font-semibold">PostgreSQL Database</h3>
						<p class="text-sm text-muted-foreground">Primary data store</p>
					</div>
				</div>
				{#if data.database.status === 'connected'}
					<CheckCircle class="h-6 w-6 text-green-500" />
				{:else}
					<XCircle class="h-6 w-6 text-red-500" />
				{/if}
			</div>

			<div class="mt-4 space-y-2">
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">Status</span>
					<span
						class="font-medium {data.database.status === 'connected'
							? 'text-green-500'
							: 'text-red-500'}"
					>
						{data.database.status === 'connected' ? 'Connected' : 'Error'}
					</span>
				</div>
				{#if data.database.version}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Version</span>
						<span class="font-mono text-xs">{data.database.version.split(' ')[0]} {data.database.version.split(' ')[1]}</span>
					</div>
				{/if}
				{#if data.database.error}
					<div class="mt-2 p-2 bg-red-500/10 rounded text-sm text-red-500">
						{data.database.error}
					</div>
				{/if}
			</div>
		</Card>

		<!-- Redis Status -->
		<Card class="p-6">
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-3">
					<div
						class="h-12 w-12 rounded-full flex items-center justify-center
						{data.redis.status === 'connected' ? 'bg-green-500/10' : 'bg-red-500/10'}"
					>
						<Server
							class="h-6 w-6 {data.redis.status === 'connected'
								? 'text-green-500'
								: 'text-red-500'}"
						/>
					</div>
					<div>
						<h3 class="text-lg font-semibold">Redis</h3>
						<p class="text-sm text-muted-foreground">Cache & rate limiting</p>
					</div>
				</div>
				{#if data.redis.status === 'connected'}
					<CheckCircle class="h-6 w-6 text-green-500" />
				{:else}
					<XCircle class="h-6 w-6 text-red-500" />
				{/if}
			</div>

			<div class="mt-4 space-y-2">
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">Status</span>
					<span
						class="font-medium {data.redis.status === 'connected'
							? 'text-green-500'
							: 'text-red-500'}"
					>
						{data.redis.status === 'connected' ? 'Connected' : 'Error'}
					</span>
				</div>
				{#if data.redis.info}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Version</span>
						<span class="font-mono text-xs">{data.redis.info}</span>
					</div>
				{/if}
				{#if data.redis.status === 'connected'}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Active Rate Limit Keys</span>
						<span>{data.redis.rateLimitKeys}</span>
					</div>
				{/if}
				{#if data.redis.error}
					<div class="mt-2 p-2 bg-red-500/10 rounded text-sm text-red-500">
						{data.redis.error}
					</div>
				{/if}
			</div>
		</Card>
	</div>

	<!-- Environment Configuration -->
	<Card class="p-6">
		<h3 class="text-lg font-semibold mb-4">Environment Configuration</h3>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
				<div class="flex items-center gap-2">
					<Globe class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm">Environment</span>
				</div>
				<span
					class="px-2 py-1 text-xs font-medium rounded {data.environment.nodeEnv === 'production'
						? 'bg-green-500/10 text-green-500'
						: 'bg-yellow-500/10 text-yellow-500'}"
				>
					{data.environment.nodeEnv}
				</span>
			</div>

			<div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
				<div class="flex items-center gap-2">
					<Shield class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm">Email Verification</span>
				</div>
				{#if data.environment.requireEmailVerification}
					<CheckCircle class="h-5 w-5 text-green-500" />
				{:else}
					<XCircle class="h-5 w-5 text-muted-foreground" />
				{/if}
			</div>

			<div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
				<div class="flex items-center gap-2">
					<Mail class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm">Mailgun</span>
				</div>
				{#if data.environment.hasMailgunKey}
					<span class="px-2 py-1 text-xs font-medium rounded bg-green-500/10 text-green-500">
						Configured
					</span>
				{:else}
					<span class="px-2 py-1 text-xs font-medium rounded bg-yellow-500/10 text-yellow-500">
						Not Set
					</span>
				{/if}
			</div>

			<div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
				<div class="flex items-center gap-2">
					<Key class="h-4 w-4 text-muted-foreground" />
					<span class="text-sm">Turnstile CAPTCHA</span>
				</div>
				{#if data.environment.hasTurnstileKey}
					<span class="px-2 py-1 text-xs font-medium rounded bg-green-500/10 text-green-500">
						Configured
					</span>
				{:else}
					<span class="px-2 py-1 text-xs font-medium rounded bg-yellow-500/10 text-yellow-500">
						Not Set
					</span>
				{/if}
			</div>
		</div>
	</Card>

	<!-- Auth URL -->
	<Card class="p-6">
		<h3 class="text-lg font-semibold mb-4">Auth Configuration</h3>
		<div class="p-3 bg-muted/50 rounded-lg">
			<div class="flex items-center gap-2 mb-1">
				<Globe class="h-4 w-4 text-muted-foreground" />
				<span class="text-sm font-medium">Better Auth URL</span>
			</div>
			<code class="text-sm text-muted-foreground">{data.environment.betterAuthUrl}</code>
		</div>
	</Card>
</div>
