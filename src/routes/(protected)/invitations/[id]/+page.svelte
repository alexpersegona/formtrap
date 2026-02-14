<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Mail, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let accepting = $state(false);
	let declining = $state(false);

	const handleAccept: SubmitFunction = () => {
		accepting = true;

		return async ({ result, update }) => {
			accepting = false;

			if (result.type === 'success') {
				const spaceName = result.data?.spaceName || 'the space';
				const spaceId = result.data?.spaceId;

				toast.success('Successfully joined the space!', {
					description: `Welcome to ${spaceName}`,
					duration: 3000
				});

				// Redirect after a short delay to show the toast
				setTimeout(() => {
					window.location.href = `/spaces/${spaceId}`;
				}, 800);

				return;
			}

			if (result.type === 'failure') {
				toast.error('Failed to accept invitation', {
					description: result.data?.error || 'Please try again.'
				});
			}
		};
	};

	const handleDecline: SubmitFunction = () => {
		declining = true;

		return async ({ result }) => {
			declining = false;

			if (result.type === 'success') {
				toast.success('Invitation declined');

				// Redirect after a short delay to show the toast
				setTimeout(() => {
					window.location.href = '/invitations';
				}, 800);

				return;
			}

			if (result.type === 'failure') {
				toast.error('Failed to decline invitation', {
					description: result.data?.error || 'Please try again.'
				});
			}
		};
	};
</script>

<div class="container mx-auto max-w-2xl py-12">
	<Card>
		<CardHeader class="space-y-4 text-center">
			<div class="flex justify-center">
				{#if data.alreadyProcessed}
					{#if data.invite.status === 'accepted'}
						<div class="rounded-full bg-green-500/10 p-3">
							<CheckCircle class="h-12 w-12 text-green-600" />
						</div>
					{:else if data.invite.status === 'declined'}
						<div class="rounded-full bg-red-500/10 p-3">
							<XCircle class="h-12 w-12 text-red-600" />
						</div>
					{:else}
						<div class="rounded-full bg-gray-500/10 p-3">
							<XCircle class="h-12 w-12 text-gray-600" />
						</div>
					{/if}
				{:else if data.isExpired}
					<div class="rounded-full bg-orange-500/10 p-3">
						<Clock class="h-12 w-12 text-orange-600" />
					</div>
				{:else if !data.isForThisUser}
					<div class="rounded-full bg-red-500/10 p-3">
						<AlertCircle class="h-12 w-12 text-red-600" />
					</div>
				{:else}
					<div class="rounded-full bg-emerald-500/10 p-3">
						<Mail class="h-12 w-12 text-emerald-600" />
					</div>
				{/if}
			</div>

			<CardTitle class="text-2xl font-bold">
				{#if data.alreadyProcessed}
					{#if data.invite.status === 'accepted'}
						Invitation Already Accepted
					{:else if data.invite.status === 'declined'}
						Invitation Declined
					{:else if data.invite.status === 'cancelled'}
						Invitation Cancelled
					{/if}
				{:else if data.isExpired}
					Invitation Expired
				{:else if !data.isForThisUser}
					Wrong Account
				{:else if data.alreadyMember}
					Already a Member
				{:else}
					Space Invitation
				{/if}
			</CardTitle>

			{#if !data.alreadyProcessed && !data.isExpired && data.isForThisUser && !data.alreadyMember}
				<CardDescription class="text-base">
					You've been invited to join <strong>{data.invite.organization.name}</strong>
				</CardDescription>
			{/if}
		</CardHeader>

		<CardContent class="space-y-6">
			<!-- Invitation Details -->
			<div class="space-y-4">
				<div class="rounded-lg bg-muted p-4 space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Space:</span>
						<span class="font-medium">{data.invite.organization.name}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Role:</span>
						<span class="font-medium capitalize">{data.invite.role}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Invited by:</span>
						<span class="font-medium">{data.invite.inviter.name}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Invited on:</span>
						<span class="font-medium">{new Date(data.invite.createdAt).toLocaleDateString()}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Expires:</span>
						<span class="font-medium">{new Date(data.invite.expiresAt).toLocaleDateString()}</span>
					</div>
				</div>

				<!-- Error/Status Messages -->
				{#if data.alreadyProcessed}
					<div class="bg-muted/50 border border-border px-4 py-3 rounded-md text-sm">
						{#if data.invite.status === 'accepted'}
							<p>This invitation has already been accepted.</p>
						{:else if data.invite.status === 'declined'}
							<p>This invitation was declined.</p>
						{:else if data.invite.status === 'cancelled'}
							<p>This invitation has been cancelled by the space admin.</p>
						{/if}
					</div>
				{:else if data.isExpired}
					<div class="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm flex items-start gap-2">
						<AlertCircle class="h-4 w-4 mt-0.5 flex-shrink-0" />
						<div>
							<p class="font-medium">This invitation has expired</p>
							<p class="mt-1">Please contact the space admin to send you a new invitation.</p>
						</div>
					</div>
				{:else if !data.isForThisUser}
					<div class="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm flex items-start gap-2">
						<AlertCircle class="h-4 w-4 mt-0.5 flex-shrink-0" />
						<div>
							<p class="font-medium">Wrong account</p>
							<p class="mt-1">
								This invitation was sent to <strong>{data.invite.email}</strong>, but you're logged in
								as a different user. Please sign in with the correct account to accept this invitation.
							</p>
						</div>
					</div>
				{:else if data.alreadyMember}
					<div class="bg-muted/50 border border-border px-4 py-3 rounded-md text-sm">
						<p>You're already a member of this space.</p>
					</div>
				{/if}

				{#if form?.error}
					<div class="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm flex items-start gap-2">
						<AlertCircle class="h-4 w-4 mt-0.5 flex-shrink-0" />
						<span>{form.error}</span>
					</div>
				{/if}
			</div>

			<!-- Action Buttons -->
			{#if !data.alreadyProcessed && !data.isExpired && data.isForThisUser && !data.alreadyMember}
				<div class="flex gap-3">
					<form method="POST" action="?/accept" use:enhance={handleAccept} class="flex-1">
						<Button
							type="submit"
							variant="fancy"
							tracking
							disabled={accepting || declining}
							class="w-full"
						>
							{accepting ? 'Accepting...' : 'Accept Invitation'}
						</Button>
					</form>

					<form method="POST" action="?/decline" use:enhance={handleDecline}>
						<Button
							type="submit"
							variant="outline"
							disabled={accepting || declining}
						>
							{declining ? 'Declining...' : 'Decline'}
						</Button>
					</form>
				</div>
			{:else}
				<div class="flex justify-center">
					<Button variant="outline" href="/invitations">
						View All Invitations
					</Button>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
