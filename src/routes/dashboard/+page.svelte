<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="container mx-auto px-4 py-12">
	<div class="max-w-4xl mx-auto space-y-6">
		<div>
			<h1 class="text-4xl font-bold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground mt-2">
				Welcome back, {data.user.name}!
			</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Your Profile</Card.Title>
					<Card.Description>Your account information</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Name</p>
						<p class="text-base">{data.user.name}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Email</p>
						<p class="text-base">{data.user.email}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Email Verified</p>
						<p class="text-base">{data.user.emailVerified ? 'Yes' : 'No'}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Quick Actions</Card.Title>
					<Card.Description>Common tasks</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2">
					<a href="/profile" class="block p-3 rounded-md hover:bg-accent transition-colors">
						<p class="font-medium">Edit Profile</p>
						<p class="text-sm text-muted-foreground">Update your account information</p>
					</a>
					<a href="/settings" class="block p-3 rounded-md hover:bg-accent transition-colors">
						<p class="font-medium">Settings</p>
						<p class="text-sm text-muted-foreground">Manage your preferences</p>
					</a>
				</Card.Content>
			</Card.Root>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Protected Route</Card.Title>
				<Card.Description>This page is only accessible to authenticated users</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">
					This is an example of a protected route. If you try to access this page without being logged in,
					you'll be redirected to the login page. The authentication check happens server-side in the
					<code class="bg-muted px-1 py-0.5 rounded">+page.server.ts</code> file.
				</p>
			</Card.Content>
		</Card.Root>
	</div>
</div>
