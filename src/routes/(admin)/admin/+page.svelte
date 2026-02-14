<script lang="ts">
	import { getContext } from 'svelte';
	import SidebarToggle from '$lib/components/sidebar-toggle.svelte';
	import * as Card from '$lib/components/ui/card';
	

	const sidebar = getContext<{ collapsed: boolean; toggleCollapse: () => void }>('sidebar');
</script>

<div class="space-y-6">
	<div class="space-y-2">
		<SidebarToggle collapsed={sidebar.collapsed} onToggle={sidebar.toggleCollapse} />
		<h1 class="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
		<p class="text-muted-foreground">
			Manage users, settings, and system configuration
		</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>User Management</Card.Title>
				<Card.Description>Manage user accounts and permissions</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground">
					User management features coming soon!
				</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>System Settings</Card.Title>
				<Card.Description>Configure system-wide settings</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-muted-foreground">
					System settings coming soon!
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Admin-Only Content</Card.Title>
			<Card.Description>This page is only accessible to administrators</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-muted-foreground">
				This is an example of an admin-protected route. Only users with the 'admin' role can access
				this page. The authorization check happens server-side in the
				<code class="bg-muted px-1 py-0.5 rounded">+layout.server.ts</code> file.
			</p>
		</Card.Content>
	</Card.Root>
</div>
