<script lang="ts">
	import type { PageData } from './$types';
	import PageIntro from '$lib/components/page-intro.svelte';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Mail, Clock, Building2, User } from 'lucide-svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';

	let { data }: { data: PageData } = $props();
</script>

<PageIntro
	title="Invitations"
	description="View and respond to space invitations sent to your email"
/>

{#if data.invites.length === 0}
	<Card>
		<CardContent class="py-12 text-center">
			<Mail class="mx-auto h-12 w-12 text-muted-foreground/50" />
			<h3 class="mt-4 text-lg font-semibold">No pending invitations</h3>
			<p class="mt-2 text-sm text-muted-foreground">
				You don't have any pending space invitations at the moment.
			</p>
		</CardContent>
	</Card>
{:else}
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each data.invites as invite}
			<Card>
				<CardHeader>
					<div class="flex items-start justify-between">
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-primary/10 p-2">
								<Building2 class="h-5 w-5" />
							</div>
							<div>
								<CardTitle class="text-base">{invite.organization.name}</CardTitle>
								<CardDescription class="text-xs mt-1">
									{invite.organization.isClientOwned ? 'Private' : 'Standard'} Space
								</CardDescription>
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					<!-- Invitation Details -->
					<div class="space-y-3">
						<div class="flex items-center gap-2 text-sm">
							<User class="h-4 w-4 text-muted-foreground" />
							<span class="text-muted-foreground">Role:</span>
							<Badge variant="secondary" class="capitalize">{invite.role}</Badge>
						</div>

						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<Mail class="h-4 w-4" />
							<span>Invited by {invite.inviter.name}</span>
						</div>

						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<Clock class="h-4 w-4" />
							<span>{new Date(invite.createdAt).toLocaleDateString()}</span>
						</div>

						{#if new Date(invite.expiresAt) < new Date()}
							<div class="rounded-lg border border-destructive bg-destructive/10 p-2">
								<p class="text-xs text-destructive">This invitation has expired</p>
							</div>
						{:else}
							<div class="text-xs text-muted-foreground">
								Expires {new Date(invite.expiresAt).toLocaleDateString()}
							</div>
						{/if}
					</div>

					<!-- Actions -->
					<div class="flex gap-2 pt-2">
						<form method="POST" action="?/accept" class="flex-1">
							<input type="hidden" name="invitationId" value={invite.id} />
							<Button type="submit" class="w-full" size="sm">Accept</Button>
						</form>
						<form method="POST" action="?/decline">
							<input type="hidden" name="invitationId" value={invite.id} />
							<Button type="submit" variant="outline" size="sm">Decline</Button>
						</form>
					</div>
				</CardContent>
			</Card>
		{/each}
	</div>
{/if}
