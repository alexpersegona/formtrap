<script lang="ts">
	import { DataTable } from '$lib/components/data-table';
	import type { Column } from '$lib/components/data-table';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { getImageUrl } from '$lib/types/images';
	import {
		CheckCircle,
		XCircle,
		ShieldAlert,
		Ban,
		ExternalLink
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const columns: Column[] = [
		{ id: 'user', label: 'User', sortable: true, hideable: false },
		{ id: 'plan', label: 'Plan', sortable: true },
		{ id: 'role', label: 'Role', sortable: true },
		{ id: 'verified', label: 'Verified', sortable: true, align: 'center' },
		{ id: 'spaces', label: 'Spaces', sortable: true, align: 'center' },
		{ id: 'forms', label: 'Forms', sortable: true, align: 'center' },
		{ id: 'joined', label: 'Joined', sortable: true },
		{ id: 'status', label: 'Status', sortable: true, align: 'center' }
	];

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getRoleBadge(role: string) {
		switch (role) {
			case 'superadmin':
				return { color: 'bg-red-500/10 text-red-500', label: 'Superadmin' };
			default:
				return { color: 'bg-blue-500/10 text-blue-500', label: 'User' };
		}
	}

	function getTierBadge(tier: string) {
		switch (tier) {
			case 'pro':
				return { color: 'bg-purple-500/10 text-purple-500', label: 'Pro' };
			case 'business':
				return { color: 'bg-amber-500/10 text-amber-500', label: 'Business' };
			default:
				return { color: 'bg-muted text-muted-foreground', label: 'Free' };
		}
	}
</script>

<DataTable
	data={data.users}
	{columns}
	visibleColumns={data.visibleColumns}
	defaultColumns={data.defaultColumns}
	pagination={data.pagination}
	sortBy={data.sortBy}
	sortOrder={data.sortOrder}
	search={data.search}
	searchPlaceholder="Search by name or email..."
	emptyMessage="No users yet"
	storageKey="superadmin-users-columns"
	itemName="users"
	title="Users"
>
	{#snippet row(user, visibleColumns)}
		{@const roleBadge = getRoleBadge(user.role)}
		{@const tierBadge = getTierBadge(user.tier)}

		{#if visibleColumns.includes('user')}
			<Table.Cell>
				<div class="flex items-center gap-3">
					<Avatar.Root class="h-9 w-9">
						<Avatar.Image src={getImageUrl(user.image, 'thumbnail')} alt={user.name} />
						<Avatar.Fallback>{user.name?.charAt(0) || 'U'}</Avatar.Fallback>
					</Avatar.Root>
					<div>
						<p class="font-medium">{user.name}</p>
						<p class="text-sm text-muted-foreground">{user.email}</p>
					</div>
				</div>
			</Table.Cell>
		{/if}

		{#if visibleColumns.includes('plan')}
			<Table.Cell>
				<span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded {tierBadge.color}">
					{tierBadge.label}
				</span>
			</Table.Cell>
		{/if}

		{#if visibleColumns.includes('role')}
			<Table.Cell>
				<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded {roleBadge.color}">
					{#if user.role === 'superadmin'}
						<ShieldAlert class="h-3 w-3" />
					{/if}
					{roleBadge.label}
				</span>
			</Table.Cell>
		{/if}

		{#if visibleColumns.includes('verified')}
			<Table.Cell class="text-center">
				{#if user.emailVerified}
					<CheckCircle class="h-5 w-5 text-green-500 mx-auto" />
				{:else}
					<XCircle class="h-5 w-5 text-muted-foreground mx-auto" />
				{/if}
			</Table.Cell>
		{/if}

		{#if visibleColumns.includes('spaces')}
			<Table.Cell class="text-center">{user.spaceCount}</Table.Cell>
		{/if}

		{#if visibleColumns.includes('forms')}
			<Table.Cell class="text-center">{user.formCount}</Table.Cell>
		{/if}

		{#if visibleColumns.includes('joined')}
			<Table.Cell class="text-muted-foreground">
				{formatDate(user.createdAt)}
			</Table.Cell>
		{/if}

		{#if visibleColumns.includes('status')}
			<Table.Cell class="text-center">
				{#if user.bannedAt}
					<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-red-500/10 text-red-500">
						<Ban class="h-3 w-3" />
						Banned
					</span>
				{:else}
					<span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-500/10 text-green-500">
						Active
					</span>
				{/if}
			</Table.Cell>
		{/if}

		<Table.Cell>
			<a href="/superadmin/users/{user.id}">
				<Button variant="ghost" size="sm">
					<ExternalLink class="h-4 w-4" />
				</Button>
			</a>
		</Table.Cell>
	{/snippet}
</DataTable>
