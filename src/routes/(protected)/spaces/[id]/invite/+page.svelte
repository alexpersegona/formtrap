<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import PageIntro from '$lib/components/page-intro.svelte';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { UserPlus } from 'lucide-svelte';
	import { page } from '$app/stores';
	import * as Select from '$lib/components/ui/select';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Get tab parameter from URL to preserve it on redirect
	let tabParam = $derived($page.url.searchParams.get('tab'));

	let submitting = $state(false);
	let emailValue = $state('');
	let roleValue = $state('member');

	const roles = [
		{ value: 'member', label: 'Member - Can view and manage forms' },
		{ value: 'admin', label: 'Admin - Can manage members and space settings' }
	];

	const selectedRoleLabel = $derived(
		roles.find((r) => r.value === roleValue)?.label ?? 'Select a role'
	);

	const handleSubmit: SubmitFunction = ({ formData }) => {
		submitting = true;
		const email = formData.get('email')?.toString() || '';

		return async ({ result }) => {
			submitting = false;

			if (result.type === 'success') {
				toast.success('Invitation sent!', {
					description: `An invitation has been sent to ${email}`,
					duration: 4000
				});
				emailValue = ''; // Clear the form

				// Navigate back to space after a brief delay, preserving the tab
				setTimeout(() => {
					const url = tabParam ? `/spaces/${data.space.id}?tab=${tabParam}` : `/spaces/${data.space.id}`;
					goto(url);
				}, 500);
			} else if (result.type === 'failure') {
				if (result.data?.errors?.email || result.data?.errors?.general) {
					toast.error('Failed to send invitation', {
						description: result.data.errors.email || result.data.errors.general,
						duration: 5000
					});
				}
			}
		};
	};
</script>

<PageIntro title="Invite Member" description="Invite someone to join {data.space.name}" />

<div class="max-w-2xl">




	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<UserPlus class="h-5 w-5" />
				Send Invitation
			</CardTitle>
			<CardDescription>
				Enter the email address of the person you'd like to invite to this space
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" use:enhance={handleSubmit} class="space-y-6">
				<!-- Email Field -->
				<div class="space-y-2">
					<Label for="email">Email Address</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="colleague@example.com"
						bind:value={emailValue}
						disabled={submitting}
						required
						aria-invalid={form?.errors?.email ? true : undefined}
					/>
					{#if form?.errors?.email}
						<p class="text-sm text-destructive">{form.errors.email}</p>
					{/if}
				</div>

				<!-- Role Field -->
				<div class="space-y-2">
					<Label for="role">Role</Label>
					<Select.Root bind:value={roleValue} disabled={submitting} type="single">
						<Select.Trigger class="w-full" aria-invalid={form?.errors?.role ? true : undefined}>
							{selectedRoleLabel}
						</Select.Trigger>
						<Select.Content>
							{#each roles as role}
								<Select.Item value={role.value} label={role.label}>
									{role.label}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<!-- Hidden input for form submission -->
					<input type="hidden" name="role" value={roleValue} />
					{#if form?.errors?.role}
						<p class="text-sm text-destructive">{form.errors.role}</p>
					{/if}
				</div>

				<!-- General Error -->
				{#if form?.errors?.general}
					<div class="rounded-lg border border-destructive bg-destructive/10 p-3">
						<p class="text-sm text-destructive">{form.errors.general}</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						href={tabParam ? `/spaces/${data.space.id}?tab=${tabParam}` : `/spaces/${data.space.id}`}
						disabled={submitting}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={submitting}>
						{submitting ? 'Sending...' : 'Send Invitation'}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<!-- Info Card -->
	<Card class="mt-6">
		<CardHeader>
			<CardTitle class="text-base">About Invitations</CardTitle>
		</CardHeader>
		<CardContent class="space-y-2 text-sm text-muted-foreground">
			<p>• Invitations are valid for 7 days</p>
			<p>• The recipient will receive an email with a link to accept the invitation</p>
			<p>• You can view pending invitations on the space details page</p>
			<p>• Members can view and manage forms in this space</p>
			<p>• Admins can additionally invite members and change space settings</p>
		</CardContent>
	</Card>
</div>
