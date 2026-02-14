<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle, UserCog, ArrowLeft, Shield } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data }: { data: PageData } = $props();
	let loading = $state(false);

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async ({ result, update }) => {
			loading = false;
			// Handle redirect or update the page
			await update();
		};
	};
</script>

<div class="max-w-lg mx-auto space-y-6">
	<!-- Back Button -->
	<a href="/superadmin/users/{data.targetUser.id}">
		<Button variant="ghost" size="sm">
			<ArrowLeft class="h-4 w-4 mr-2" />
			Back to User
		</Button>
	</a>

	<!-- Warning Card -->
	<Card class="p-6 border-yellow-500/50 bg-yellow-500/5">
		<div class="flex items-start gap-4">
			<div class="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
				<AlertTriangle class="h-6 w-6 text-yellow-500" />
			</div>
			<div>
				<h2 class="text-lg font-semibold">Impersonation Warning</h2>
				<p class="text-sm text-muted-foreground mt-1">
					You are about to view the application as another user. This action will be logged
					for security and audit purposes.
				</p>
			</div>
		</div>
	</Card>

	<!-- Impersonation Details -->
	<Card class="p-6">
		<div class="space-y-6">
			<!-- From -->
			<div>
				<p class="text-sm text-muted-foreground mb-2">Impersonating as:</p>
				<div class="flex items-center gap-3 p-3 bg-muted rounded-lg">
					<div class="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
						<Shield class="h-5 w-5 text-red-500" />
					</div>
					<div>
						<p class="font-medium">{data.superadmin.name}</p>
						<p class="text-sm text-muted-foreground">Superadmin</p>
					</div>
				</div>
			</div>

			<!-- Arrow -->
			<div class="flex justify-center">
				<div class="p-2 rounded-full bg-muted">
					<UserCog class="h-5 w-5 text-muted-foreground" />
				</div>
			</div>

			<!-- To -->
			<div>
				<p class="text-sm text-muted-foreground mb-2">Will view as:</p>
				<div class="flex items-center gap-3 p-3 bg-muted rounded-lg">
					<div class="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
						<span class="text-blue-500 font-semibold">
							{data.targetUser.name?.charAt(0) || 'U'}
						</span>
					</div>
					<div>
						<p class="font-medium">{data.targetUser.name}</p>
						<p class="text-sm text-muted-foreground">{data.targetUser.email}</p>
						<p class="text-xs text-muted-foreground capitalize">Role: {data.targetUser.role}</p>
					</div>
				</div>
			</div>

			<!-- What happens -->
			<div class="border-t pt-4">
				<p class="text-sm font-medium mb-2">What will happen:</p>
				<ul class="text-sm text-muted-foreground space-y-1">
					<li>• You will see the app exactly as this user sees it</li>
					<li>• A banner will show at the top indicating impersonation mode</li>
					<li>• All your actions will be attributed to your superadmin account in logs</li>
					<li>• Session expires after 4 hours or when you end impersonation</li>
				</ul>
			</div>

			<!-- Start Button -->
			<form method="POST" action="?/start" use:enhance={handleSubmit}>
				<input type="hidden" name="targetUserId" value={data.targetUser.id} />
				<Button type="submit" class="w-full" disabled={loading}>
					{#if loading}
						Starting impersonation...
					{:else}
						Start Impersonation
					{/if}
				</Button>
			</form>
		</div>
	</Card>
</div>
