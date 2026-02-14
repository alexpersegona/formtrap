<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Table from '$lib/components/ui/table';
	import { getImageUrl } from '$lib/types/images';
	import { toast } from 'svelte-sonner';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		ArrowLeft,
		CheckCircle,
		XCircle,
		Shield,
		ShieldAlert,
		Ban,
		UserCheck,
		Building2,
		FileText,
		Mail,
		Calendar,
		Crown,
		UserCog
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let banDialogOpen = $state(false);
	let banReason = $state('');
	let roleDialogOpen = $state(false);
	let selectedRole = $state(data.targetUser.role);
	let loading = $state(false);

	function formatDate(date: Date | string | null) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getRoleBadge(role: string) {
		switch (role) {
			case 'superadmin':
				return { color: 'bg-red-500/10 text-red-500', label: 'Superadmin', icon: ShieldAlert };
			case 'admin':
				return { color: 'bg-purple-500/10 text-purple-500', label: 'Admin', icon: Shield };
			default:
				return { color: 'bg-blue-500/10 text-blue-500', label: 'User', icon: UserCog };
		}
	}

	const roleBadge = $derived(getRoleBadge(data.targetUser.role));

	const handleAction: SubmitFunction = () => {
		loading = true;
		return async ({ result, update }) => {
			loading = false;
			if (result.type === 'success') {
				toast.success(result.data?.message || 'Action completed');
				banDialogOpen = false;
				roleDialogOpen = false;
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error(result.data?.error || 'Action failed');
			}
		};
	};
</script>

<div class="space-y-6">
	<!-- Back Button & Header -->
	<div class="flex items-center gap-4">
		<a href="/superadmin/users">
			<Button variant="ghost" size="sm">
				<ArrowLeft class="h-4 w-4 mr-2" />
				Back to Users
			</Button>
		</a>
	</div>

	<!-- User Profile Card -->
	<Card class="p-6">
		<div class="flex flex-col md:flex-row gap-6">
			<!-- Avatar & Basic Info -->
			<div class="flex items-start gap-4">
				<Avatar.Root class="h-20 w-20">
					<Avatar.Image
						src={getImageUrl(data.targetUser.image, 'medium')}
						alt={data.targetUser.name}
					/>
					<Avatar.Fallback class="text-2xl">
						{data.targetUser.name?.charAt(0) || 'U'}
					</Avatar.Fallback>
				</Avatar.Root>
				<div>
					<div class="flex items-center gap-2">
						<h1 class="text-2xl font-bold">{data.targetUser.name}</h1>
						{#if data.targetUser.bannedAt}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-red-500/10 text-red-500"
							>
								<Ban class="h-3 w-3" />
								Banned
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-2 mt-1 text-muted-foreground">
						<Mail class="h-4 w-4" />
						<span>{data.targetUser.email}</span>
						{#if data.targetUser.emailVerified}
							<CheckCircle class="h-4 w-4 text-green-500" />
						{:else}
							<XCircle class="h-4 w-4 text-muted-foreground" />
						{/if}
					</div>
					<div class="flex items-center gap-2 mt-2">
						<span
							class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded {roleBadge.color}"
						>
							<roleBadge.icon class="h-3 w-3" />
							{roleBadge.label}
						</span>
						{#if data.subscription}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-amber-500/10 text-amber-500"
							>
								<Crown class="h-3 w-3" />
								{data.subscription.tier === 'pro' ? 'Pro' : 'Free'}
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Stats -->
			<div class="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:ml-auto">
				<div class="text-center p-4 bg-muted/50 rounded-lg">
					<Building2 class="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
					<p class="text-2xl font-bold">{data.stats.spacesCount}</p>
					<p class="text-xs text-muted-foreground">Spaces</p>
				</div>
				<div class="text-center p-4 bg-muted/50 rounded-lg">
					<FileText class="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
					<p class="text-2xl font-bold">{data.stats.formsCreated}</p>
					<p class="text-xs text-muted-foreground">Forms</p>
				</div>
				<div class="text-center p-4 bg-muted/50 rounded-lg">
					<Calendar class="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
					<p class="text-sm font-medium">
						{new Date(data.targetUser.createdAt).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: 'numeric'
						})}
					</p>
					<p class="text-xs text-muted-foreground">Joined</p>
				</div>
				<div class="text-center p-4 bg-muted/50 rounded-lg">
					{#if data.targetUser.emailVerified}
						<CheckCircle class="h-5 w-5 mx-auto mb-1 text-green-500" />
						<p class="text-sm font-medium text-green-500">Verified</p>
					{:else}
						<XCircle class="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
						<p class="text-sm font-medium">Unverified</p>
					{/if}
					<p class="text-xs text-muted-foreground">Email</p>
				</div>
			</div>
		</div>

		<!-- Ban Reason (if banned) -->
		{#if data.targetUser.bannedAt}
			<div class="mt-4 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
				<p class="text-sm font-medium text-red-500">
					Banned on {formatDate(data.targetUser.bannedAt)}
				</p>
				{#if data.targetUser.banReason}
					<p class="text-sm text-muted-foreground mt-1">Reason: {data.targetUser.banReason}</p>
				{/if}
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex flex-wrap gap-2 mt-6 pt-6 border-t">
			<!-- Verify Email -->
			{#if !data.targetUser.emailVerified}
				<form method="POST" action="?/verifyEmail" use:enhance={handleAction}>
					<Button variant="outline" size="sm" type="submit" disabled={loading}>
						<UserCheck class="h-4 w-4 mr-2" />
						Verify Email
					</Button>
				</form>
			{/if}

			<!-- Change Role -->
			<Button variant="outline" size="sm" onclick={() => (roleDialogOpen = true)}>
				<Shield class="h-4 w-4 mr-2" />
				Change Role
			</Button>

			<!-- Ban/Unban -->
			{#if data.targetUser.bannedAt}
				<form method="POST" action="?/unbanUser" use:enhance={handleAction}>
					<Button variant="outline" size="sm" type="submit" disabled={loading}>
						<UserCheck class="h-4 w-4 mr-2" />
						Unban User
					</Button>
				</form>
			{:else}
				<Button
					variant="destructive"
					size="sm"
					onclick={() => (banDialogOpen = true)}
					disabled={data.targetUser.role === 'superadmin'}
				>
					<Ban class="h-4 w-4 mr-2" />
					Ban User
				</Button>
			{/if}

			<!-- Impersonate (future) -->
			<a href="/superadmin/impersonate?userId={data.targetUser.id}">
				<Button
					variant="secondary"
					size="sm"
					disabled={data.targetUser.role === 'superadmin' || !!data.targetUser.bannedAt}
				>
					<UserCog class="h-4 w-4 mr-2" />
					Impersonate
				</Button>
			</a>
		</div>
	</Card>

	<!-- User's Spaces -->
	<Card class="p-6">
		<h2 class="text-lg font-semibold mb-4">Spaces</h2>
		{#if data.spaces.length > 0}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Space</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head class="text-center">Forms</Table.Head>
						<Table.Head class="text-center">Submissions</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Created</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.spaces as space}
						<Table.Row>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<Building2 class="h-4 w-4 text-muted-foreground" />
									<span class="font-medium">{space.name}</span>
									{#if space.isClientOwned}
										<span class="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded"
											>Client</span
										>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<span class="capitalize">{space.role}</span>
							</Table.Cell>
							<Table.Cell class="text-center">{space.formCount}</Table.Cell>
							<Table.Cell class="text-center">{space.submissionCount}</Table.Cell>
							<Table.Cell>
								{#if space.isPaused}
									<span class="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded"
										>Paused</span
									>
								{:else}
									<span class="text-xs px-2 py-1 bg-green-500/10 text-green-500 rounded"
										>Active</span
									>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground">
								{new Date(space.createdAt).toLocaleDateString()}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{:else}
			<p class="text-muted-foreground text-center py-8">This user has no spaces</p>
		{/if}
	</Card>
</div>

<!-- Ban Dialog -->
<Dialog.Root bind:open={banDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Ban User</Dialog.Title>
			<Dialog.Description>
				This will prevent {data.targetUser.name} from logging in. You can unban them later.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/banUser" use:enhance={handleAction}>
			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<Label for="reason">Reason (optional)</Label>
					<Input
						id="reason"
						name="reason"
						placeholder="e.g., Violation of terms of service"
						bind:value={banReason}
					/>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => (banDialogOpen = false)}>
					Cancel
				</Button>
				<Button variant="destructive" type="submit" disabled={loading}>
					{loading ? 'Banning...' : 'Ban User'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Role Dialog -->
<Dialog.Root bind:open={roleDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Change Role</Dialog.Title>
			<Dialog.Description>
				Update the role for {data.targetUser.name}
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/updateRole" use:enhance={handleAction}>
			<div class="space-y-4 py-4">
				<div class="space-y-2">
					<Label for="role">Role</Label>
					<Select.Root type="single" name="role" bind:value={selectedRole}>
						<Select.Trigger class="w-full">
							{selectedRole === 'superadmin'
								? 'Superadmin'
								: selectedRole === 'admin'
									? 'Admin'
									: 'User'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="user">User</Select.Item>
							<Select.Item value="admin">Admin</Select.Item>
							<Select.Item value="superadmin">Superadmin</Select.Item>
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="role" value={selectedRole} />
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => (roleDialogOpen = false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Updating...' : 'Update Role'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
