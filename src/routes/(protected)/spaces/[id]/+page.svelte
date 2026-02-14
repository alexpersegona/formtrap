<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Users, Settings, Mail, Clock, ShieldAlert, Plus, FileText, Calendar, User, ShieldCheck, PauseCircle, PlayCircle, AlertTriangle, Trash2 } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Item from '$lib/components/ui/item';
	import * as Alert from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { toast } from 'svelte-sonner';
	import { formatDistanceToNow } from 'date-fns';
	import UsageBadge from '$lib/components/UsageBadge.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import { getImageUrl } from '$lib/types/images';

	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Get active tab from URL query param, default to 'forms'
	let activeTab = $derived($page.url.searchParams.get('tab') || 'forms');

	// Update URL when tab changes
	function handleTabChange(value: string | undefined) {
		if (value && value !== 'forms') {
			goto(`?tab=${value}`, { replaceState: true, keepFocus: true });
		} else {
			goto($page.url.pathname, { replaceState: true, keepFocus: true });
		}
	}

	let cancellingInvites = $state<Record<string, boolean>>({});

	const handleCancelInvitation: SubmitFunction = ({ formData }) => {
		const inviteId = formData.get('inviteId') as string;
		cancellingInvites[inviteId] = true;

		return async ({ result }) => {
			cancellingInvites[inviteId] = false;

			if (result.type === 'success') {
				toast.success('Invitation successfully cancelled');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to cancel invitation', {
					description: result.data?.error || 'Please try again.'
				});
			}
		};
	};

	// Settings tab state
	let logoUrl = $derived(getImageUrl(data.space.logo, 'regular'));
	let submittingGeneral = $state(false);
	let togglingPrivacy = $state(false);
	let togglingPaused = $state(false);
	let deletingSpace = $state(false);
	let deleteDialogOpen = $state(false);
	let deleteConfirmName = $state('');
	let nameValue = $state(data.space.name);
	let canDelete = $derived(deleteConfirmName.toLowerCase() === data.space.name.toLowerCase());

	const handleGeneralSubmit: SubmitFunction = () => {
		submittingGeneral = true;

		return async ({ result }) => {
			submittingGeneral = false;

			if (result.type === 'success') {
				toast.success('Settings updated successfully');
				await invalidateAll();
			} else if (result.type === 'failure') {
				if (result.data?.errors?.name) {
					toast.error('Failed to update settings', {
						description: result.data.errors.name
					});
				} else if (result.data?.errors?.logo) {
					toast.error('Failed to upload logo', {
						description: result.data.errors.logo
					});
				} else if (result.data?.errors?.general) {
					toast.error('Failed to update settings', {
						description: result.data.errors.general
					});
				}
			}
		};
	};

	const handlePrivacyToggle: SubmitFunction = () => {
		togglingPrivacy = true;

		return async ({ result }) => {
			togglingPrivacy = false;

			if (result.type === 'success') {
				toast.success('Privacy settings updated');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to update privacy settings', {
					description: result.data?.error || 'Please try again'
				});
			}
		};
	};

	const handlePausedToggle: SubmitFunction = () => {
		togglingPaused = true;

		return async ({ result }) => {
			togglingPaused = false;

			if (result.type === 'success') {
				const newStatus = !data.space.isPaused;
				toast.success(newStatus ? 'Space paused' : 'Space activated');
				await invalidateAll();
			} else if (result.type === 'failure') {
				toast.error('Failed to update space status', {
					description: result.data?.error || 'Please try again'
				});
			}
		};
	};

	const handleDeleteSpace: SubmitFunction = () => {
		deletingSpace = true;
		deleteDialogOpen = false;

		return async ({ result, update }) => {
			if (result.type === 'failure') {
				deletingSpace = false;
				toast.error('Failed to delete space', {
					description: result.data?.error || 'Please try again'
				});
			}
			await update();
		};
	};
</script>

<!-- Space Header -->
<div class="mb-8 flex items-center justify-between">
	<div class="flex items-center gap-3">
		<h1 class="text-3xl font-bold tracking-tight leading-tight my-0">{data.space.name}</h1>
		<Badge variant="secondary" class="capitalize">{data.userRole}</Badge>
		{#if data.space.isClientOwned}
			<div class="flex items-center gap-1 text-amber-600" title="Client-owned space">
				<ShieldAlert class="h-5 w-5" />
				<span class="text-sm font-medium">Private</span>
			</div>
		{/if}
	</div>
</div>

<div class="w-full">
	<!-- Main Content -->
	<Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
		<Tabs.List variant="important" class="mb-6">
			<Tabs.Trigger value="forms">Forms</Tabs.Trigger>
			<Tabs.Trigger value="members">Members</Tabs.Trigger>
			{#if data.isOwner}
				<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
			{/if}
		</Tabs.List>

		<Tabs.Content value="forms" class="flex flex-col gap-6">
			<!-- Header with Usage Badge and Create Button -->
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold">Forms</h2>
					<p class="text-muted-foreground text-sm">Manage forms in this space</p>
				</div>
				<div class="flex items-center gap-4">
					<!-- Usage Badge -->
					{#if data.maxForms !== -1}
						<UsageBadge
							label="Forms"
							current={data.currentFormCount}
							max={data.maxForms}
							variant="compact"
						/>
					{/if}

					<!-- Create Button -->
					<Button
						href="/spaces/{data.space.id}/forms/new"
						disabled={!data.canCreateForm}
						class="gap-2"
					>
						<Plus class="h-4 w-4" />
						Create Form
					</Button>
				</div>
			</div>

			<!-- Limit Warning -->
			{#if !data.canCreateForm && data.limitReason}
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
					<p><strong>Form Limit Reached:</strong></p>
					<p>{data.limitReason}</p>
				</div>
			{/if}

			<!-- Forms List -->
			{#if data.forms.length === 0}
				<Card>
					<CardContent class="flex flex-col items-center justify-center py-12">
						<FileText class="text-muted-foreground mb-4 h-12 w-12" />
						<h3 class="mb-2 text-lg font-semibold">No forms yet</h3>
						<p class="text-muted-foreground mb-4 text-center">
							Create your first form to start capturing submissions
						</p>
						{#if data.canCreateForm}
							<Button href="/spaces/{data.space.id}/forms/new" class="gap-2">
								<Plus class="h-4 w-4" />
								Create Your First Form
							</Button>
						{/if}
					</CardContent>
				</Card>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each data.forms as form}
						<Card class="hover:border-primary transition-colors flex flex-col">
							<CardHeader>
								<CardTitle class="flex items-start justify-between gap-2 text-lg">
									<span class="flex-1">{form.name}</span>
									{#if form.isActive}
										<Badge variant="default" class="bg-green-100 text-green-800 shrink-0">Active</Badge>
									{:else}
										<Badge variant="secondary" class="shrink-0">Inactive</Badge>
									{/if}
								</CardTitle>
								<CardDescription class="line-clamp-2">
									{form.description || '\u00A0'}
								</CardDescription>
							</CardHeader>

							<CardContent class="flex-1 space-y-3">
								<!-- Created By -->
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<User class="h-3 w-3" />
									<span>{form.createdByUser.name}</span>
								</div>

								<!-- Unread Submissions -->
								{#if form.unreadCount > 0}
									<div class="flex items-center gap-2 text-sm text-muted-foreground">
										<Mail class="h-3 w-3" />
										<span>{form.unreadCount} new submission{form.unreadCount === 1 ? '' : 's'}</span>
									</div>
								{/if}
							</CardContent>

							<CardFooter class="flex gap-2">
								<Button
									href="/spaces/{data.space.id}/forms/{form.id}"
									variant="outline"
									size="sm"
									class="flex-1"
								>
									View
								</Button>
								<Button
									href="/spaces/{data.space.id}/forms/{form.id}/edit"
									variant="outline"
									size="sm"
									class="flex-1"
								>
									Edit
								</Button>
							</CardFooter>
						</Card>
					{/each}
				</div>
			{/if}
		</Tabs.Content>
		<Tabs.Content value="members">
			<!-- Members -->
			<div class="space-y-6">
				<!-- Members Card -->
				<Card>
					<CardHeader>
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-1.5">
								<CardTitle class="flex items-center gap-2">
									<Users class="h-5 w-5" />
									Members
								</CardTitle>
								<CardDescription>Team members with access to this space</CardDescription>
							</div>
							{#if data.isAdmin}
								<Button variant="fancy" tracking href="/spaces/{data.space.id}/invite?tab=members" size="sm" class="shrink-0">
									Invite
								</Button>
							{/if}
						</div>
					</CardHeader>
					<CardContent>
						<div class="flex flex-col gap-2">
							{#each data.space.members as membership, index (membership.id)}
								<Item.Root variant="outline">
									<Item.Media>
										<Avatar>
											<AvatarImage src={membership.user.image} alt={membership.user.name} />
											<AvatarFallback>
												{membership.user.name.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									</Item.Media>
									<Item.Content>
										<Item.Title>
											<span class="flex items-center gap-2">
												{membership.user.name}
												<Badge variant={membership.role === 'admin' ? 'warning' : 'secondary'}>
													{membership.role}
												</Badge>
											</span>
										</Item.Title>
										<Item.Description>{membership.user.email}</Item.Description>
									</Item.Content>
								</Item.Root>
							{/each}
						</div>
					</CardContent>
				</Card>

				<!-- Pending Invitations (Admin Only) -->
				{#if data.isAdmin && data.pendingInvites.length > 0}
					<Card>
						<CardHeader>
							<CardTitle class="flex items-center gap-2">
								<Mail class="h-5 w-5" />
								Pending Invitations
							</CardTitle>
							<CardDescription>{data.pendingInvites.length} pending</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="flex flex-col gap-2">
								{#each data.pendingInvites as invite, index (invite.id)}
									<Item.Root variant="outline">
										<Item.Media variant="icon">
											<Mail class="h-4 w-4" />
										</Item.Media>
										<Item.Content>
											<Item.Title>
												<span class="flex items-center gap-2">
													{invite.email}
													<Badge variant="secondary" class="text-xs capitalize">
														{invite.role}
													</Badge>
												</span>
											</Item.Title>
											<Item.Description class="flex items-center gap-2">
												<span class="flex items-center gap-1">
													<Clock class="h-3 w-3" />
													{new Date(invite.createdAt).toLocaleDateString()}
												</span>
												<span>•</span>
												<span>
													Invited by
													{(invite.inviter as { name: string } | undefined)?.name || 'Unknown'}
												</span>
											</Item.Description>
										</Item.Content>
										<Item.Actions>
											<form
												method="POST"
												action="?/cancelInvitation"
												use:enhance={handleCancelInvitation}
											>
												<input type="hidden" name="inviteId" value={invite.id} />
												<Button
													type="submit"
													variant="secondary"
													size="sm"
													disabled={cancellingInvites[invite.id]}
												>
													{cancellingInvites[invite.id] ? 'Cancelling...' : 'Cancel'}
												</Button>
											</form>
										</Item.Actions>
									</Item.Root>
								{/each}
							</div>
						</CardContent>
					</Card>
				{/if}
			</div>
		</Tabs.Content>

		<!-- Settings Tab (Owner Only) -->
		{#if data.isOwner}
			<Tabs.Content value="settings">
				<div class="space-y-6">
					<!-- General Settings Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<Settings class="h-5 w-5" />
							General Settings
						</CardTitle>
						<CardDescription>Update your space name and logo</CardDescription>
					</CardHeader>
					<CardContent>
						<form method="POST" action="?/updateGeneral" enctype="multipart/form-data" use:enhance={handleGeneralSubmit} class="space-y-6">
							<!-- Name Field -->
							<div class="space-y-2">
								<Label for="name">Space Name</Label>
								<Input
									id="name"
									name="name"
									type="text"
									bind:value={nameValue}
									disabled={submittingGeneral}
									required
									maxlength={100}
									aria-invalid={form?.errors?.name ? true : undefined}
								/>
								{#if form?.errors?.name}
									<p class="text-sm text-destructive">{form.errors.name}</p>
								{/if}
							</div>

							<!-- Logo Upload -->
							<div class="space-y-2">
								<Label>Space Logo</Label>
								<ImageUpload
									name="logo"
									value={logoUrl}
									disabled={submittingGeneral}
									fallbackText={data.space.name.charAt(0).toUpperCase()}
									round={false}
								/>
								{#if form?.errors?.logo}
									<p class="text-sm text-destructive">{form.errors.logo}</p>
								{/if}
								<p class="text-sm text-muted-foreground">
									Automatically optimized and converted to WebP. Multiple sizes generated for different uses.
								</p>
							</div>

							<!-- General Error -->
							{#if form?.errors?.general}
								<div class="rounded-lg border border-destructive bg-destructive/10 p-3">
									<p class="text-sm text-destructive">{form.errors.general}</p>
								</div>
							{/if}

							<!-- Submit Button -->
							<div class="flex justify-end">
								<Button type="submit" disabled={submittingGeneral} variant="fancy" tracking>
									{submittingGeneral ? 'Saving...' : 'Save Changes'}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				<!-- Privacy Settings Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							<ShieldAlert class="h-5 w-5" />
							Privacy Settings
						</CardTitle>
						<CardDescription>Control who can view form submissions in this space</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<Alert.Root variant={data.space.isClientOwned ? 'default' : 'destructive'}>
							<Alert.Title>
								{data.space.isClientOwned ? 'Client-Owned Mode (Private)' : 'Standard Mode (Open)'}
							</Alert.Title>
							<Alert.Description>
								{#if data.space.isClientOwned}
									<p>As the space owner, you <strong>cannot view</strong> form submissions. This ensures
									client data remains private. Invited members can still access submissions.</p>
								{:else}
									<p>All space members, including you as owner, can view form submissions.</p>
								{/if}
							</Alert.Description>
						</Alert.Root>

						<!-- Toggle Button -->
						<form
							method="POST"
							action="?/toggleClientOwned"
							use:enhance={handlePrivacyToggle}
							class="flex justify-end"
						>
							<input
								type="hidden"
								name="isClientOwned"
								value={(!data.space.isClientOwned).toString()}
							/>
							<Button type="submit" variant="outline" disabled={togglingPrivacy}>
								{togglingPrivacy ? 'Updating...' : 'Switch to'}
								{data.space.isClientOwned ? 'Standard Mode' : 'Client-Owned Mode'}
							</Button>
						</form>
					</CardContent>
				</Card>

				<!-- Status Management Card -->
				<Card>
					<CardHeader>
						<CardTitle class="flex items-center gap-2">
							{#if data.space.isPaused}
								<PauseCircle class="h-5 w-5" />
							{:else}
								<PlayCircle class="h-5 w-5" />
							{/if}
							Status Management
						</CardTitle>
						<CardDescription>Pause or activate this space</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<Alert.Root variant={data.space.isPaused ? 'destructive' : 'default'}>
							<Alert.Title>
								{data.space.isPaused ? 'Space is Paused' : 'Space is Active'}
							</Alert.Title>
							<Alert.Description>
								{#if data.space.isPaused}
									This space is currently paused. Non-owner members cannot access it. Forms will
									not accept new submissions.
								{:else}
									This space is active. All members can access it and forms are accepting
									submissions.
								{/if}
							</Alert.Description>
						</Alert.Root>

						<!-- Warning for Pausing -->
						{#if !data.space.isPaused}
							<p class="text-xs text-muted-foreground"><strong>Note:</strong> Pausing this space will prevent all non-owner members from accessing
							it. Forms will stop accepting submissions. Use this for violations, missed payments, or
							temporary lockdowns.</p>
						{/if}

						<!-- Toggle Button -->
						<form
							method="POST"
							action="?/togglePaused"
							use:enhance={handlePausedToggle}
							class="flex justify-end"
						>
							<input
								type="hidden"
								name="isPaused"
								value={(!data.space.isPaused).toString()}
							/>
							<Button
								type="submit"
								variant={data.space.isPaused ? "default" : "destructive"}
								disabled={togglingPaused}
								tracking
							>
								{togglingPaused ? 'Updating...' : data.space.isPaused ? 'Activate Space' : 'Pause Space'}
							</Button>
						</form>
					</CardContent>
				</Card>

				<!-- Danger Zone Card -->
				<Card class="border-destructive">
					<CardHeader>
						<CardTitle class="flex items-center gap-2 text-destructive">
							<Trash2 class="h-5 w-5" />
							Danger Zone
						</CardTitle>
						<CardDescription>Permanently delete this space and all its data</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<Alert.Root variant="destructive">
							<AlertTriangle class="h-4 w-4" />
							<Alert.Title>Warning: This action cannot be undone</Alert.Title>
							<Alert.Description>
								Deleting this space will permanently remove:
								<ul class="mt-2 ml-4 list-disc space-y-1">
									<li>All forms associated with this space</li>
									<li>All form submissions and uploaded files</li>
									<li>All team members and invitations</li>
									<li>All space settings and configurations</li>
								</ul>
							</Alert.Description>
						</Alert.Root>

						<Dialog.Root bind:open={deleteDialogOpen}>
							<Dialog.Trigger class="w-full inline-flex justify-end">
								<Button variant="destructive" class="w-full sm:w-auto">
									<Trash2 class="mr-2 h-4 w-4" />
									Delete Space
								</Button>
							</Dialog.Trigger>
							<Dialog.Content class="sm:max-w-md">
								<Dialog.Header>
									<Dialog.Title>Delete Space: {data.space.name}</Dialog.Title>
									<Dialog.Description>
										This action cannot be undone. This will permanently delete the space and all associated data.
									</Dialog.Description>
								</Dialog.Header>

								<form method="POST" action="?/deleteSpace" use:enhance={handleDeleteSpace} class="space-y-4">
									<div class="space-y-2">
										<Label for="confirmName" class="text-sm font-medium">
											Type <code class="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">{data.space.name.toLowerCase()}</code> to confirm
										</Label>
										<Input
											id="confirmName"
											name="confirmName"
											type="text"
											bind:value={deleteConfirmName}
											placeholder="Space name (in lowercase)"
											disabled={deletingSpace}
											required
											class="font-mono"
										/>
										<p class="text-xs text-muted-foreground">
											Please type the space name exactly as shown above, in all lowercase letters.
										</p>
									</div>

									<Dialog.Footer class="flex-col-reverse sm:flex-row sm:justify-end gap-2">
										<Dialog.Close>
											<Button
												type="button"
												variant="outline"
												disabled={deletingSpace}
											>
												Cancel
											</Button>
										</Dialog.Close>
										<Button
											type="submit"
											variant="destructive"
											disabled={!canDelete || deletingSpace}
										>
											{deletingSpace ? 'Deleting...' : 'Delete Space Permanently'}
										</Button>
									</Dialog.Footer>
								</form>
							</Dialog.Content>
						</Dialog.Root>
					</CardContent>
				</Card>
				</div>
			</Tabs.Content>
		{/if}
	</Tabs.Root>
</div>
