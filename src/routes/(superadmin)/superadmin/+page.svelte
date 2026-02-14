<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { getImageUrl } from '$lib/types/images';
	import {
		Users,
		Building2,
		FileText,
		Mail,
		CheckCircle,
		PauseCircle,
		TrendingUp,
		Clock
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Format date for display
	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Format relative time
	function timeAgo(date: Date | string) {
		const now = new Date();
		const then = new Date(date);
		const diffMs = now.getTime() - then.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	}

	// Calculate verification rate
	const verificationRate = $derived(
		data.metrics.totalUsers > 0
			? Math.round((data.metrics.verifiedUsers / data.metrics.totalUsers) * 100)
			: 0
	);

	// Calculate max counts for charts
	const signupsMaxCount = $derived(
		Math.max(...data.charts.signupsByDay.map((d) => d.count), 1)
	);
	const submissionsMaxCount = $derived(
		Math.max(...data.charts.submissionsByDay.map((d) => d.count), 1)
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
		<p class="text-muted-foreground">Platform overview and key metrics</p>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Users</p>
					<p class="text-3xl font-bold">{data.metrics.totalUsers}</p>
				</div>
				<div class="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
					<Users class="h-6 w-6 text-blue-500" />
				</div>
			</div>
			<div class="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
				<CheckCircle class="h-4 w-4 text-green-500" />
				<span>{data.metrics.verifiedUsers} verified ({verificationRate}%)</span>
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Spaces</p>
					<p class="text-3xl font-bold">{data.metrics.totalSpaces}</p>
				</div>
				<div class="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
					<Building2 class="h-6 w-6 text-purple-500" />
				</div>
			</div>
			<div class="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
				<PauseCircle class="h-4 w-4 text-yellow-500" />
				<span>{data.metrics.pausedSpaces} paused</span>
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Forms</p>
					<p class="text-3xl font-bold">{data.metrics.totalForms}</p>
				</div>
				<div class="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
					<FileText class="h-6 w-6 text-green-500" />
				</div>
			</div>
			<div class="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
				<TrendingUp class="h-4 w-4 text-green-500" />
				<span>{data.metrics.totalSubmissions} submissions</span>
			</div>
		</Card>

		<Card class="p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Contact Inbox</p>
					<p class="text-3xl font-bold">{data.metrics.unreadContact}</p>
				</div>
				<div class="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
					<Mail class="h-6 w-6 text-orange-500" />
				</div>
			</div>
			<div class="mt-2 text-sm text-muted-foreground">
				<a href="/superadmin/contact" class="text-orange-500 hover:underline">
					View unread messages
				</a>
			</div>
		</Card>
	</div>

	<!-- Charts Section -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Signups Chart -->
		<Card class="p-6">
			<h3 class="text-lg font-semibold mb-4">Signups (Last 30 days)</h3>
			{#if data.charts.signupsByDay.length > 0}
				<div class="h-48 flex items-end gap-1">
					{#each data.charts.signupsByDay as day}
						<div
							class="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
							style="height: {(day.count / signupsMaxCount) * 100}%"
							title="{day.date}: {day.count} signups"
						></div>
					{/each}
				</div>
				<p class="text-sm text-muted-foreground mt-2 text-center">
					{data.charts.signupsByDay.reduce((sum, d) => sum + d.count, 0)} total signups
				</p>
			{:else}
				<div class="h-48 flex items-center justify-center text-muted-foreground">
					No signups in the last 30 days
				</div>
			{/if}
		</Card>

		<!-- Submissions Chart -->
		<Card class="p-6">
			<h3 class="text-lg font-semibold mb-4">Submissions (Last 30 days)</h3>
			{#if data.charts.submissionsByDay.length > 0}
				<div class="h-48 flex items-end gap-1">
					{#each data.charts.submissionsByDay as day}
						<div
							class="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
							style="height: {(day.count / submissionsMaxCount) * 100}%"
							title="{day.date}: {day.count} submissions"
						></div>
					{/each}
				</div>
				<p class="text-sm text-muted-foreground mt-2 text-center">
					{data.charts.submissionsByDay.reduce((sum, d) => sum + d.count, 0)} total submissions
				</p>
			{:else}
				<div class="h-48 flex items-center justify-center text-muted-foreground">
					No submissions in the last 30 days
				</div>
			{/if}
		</Card>
	</div>

	<!-- Recent Activity -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Recent Users -->
		<Card class="p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold">Recent Users</h3>
				<a href="/superadmin/users" class="text-sm text-muted-foreground hover:underline">
					View all
				</a>
			</div>
			<div class="space-y-4">
				{#each data.recent.users as user}
					<a
						href="/superadmin/users/{user.id}"
						class="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-accent transition-colors"
					>
						<Avatar.Root class="h-9 w-9">
							<Avatar.Image src={getImageUrl(user.image, 'thumbnail')} alt={user.name} />
							<Avatar.Fallback>{user.name?.charAt(0) || 'U'}</Avatar.Fallback>
						</Avatar.Root>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium truncate">{user.name}</p>
							<p class="text-xs text-muted-foreground truncate">{user.email}</p>
						</div>
						<div class="flex items-center gap-2">
							{#if user.emailVerified}
								<CheckCircle class="h-4 w-4 text-green-500" />
							{/if}
							<span class="text-xs text-muted-foreground">{timeAgo(user.createdAt)}</span>
						</div>
					</a>
				{:else}
					<p class="text-muted-foreground text-sm">No users yet</p>
				{/each}
			</div>
		</Card>

		<!-- Recent Submissions -->
		<Card class="p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg font-semibold">Recent Submissions</h3>
				<a href="/superadmin/forms" class="text-sm text-muted-foreground hover:underline">
					View all forms
				</a>
			</div>
			<div class="space-y-4">
				{#each data.recent.submissions as sub}
					<div class="flex items-center gap-3 p-2 -mx-2 rounded-md">
						<div
							class="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
						>
							<FileText class="h-4 w-4 text-muted-foreground" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium truncate">{sub.name || sub.email || 'Anonymous'}</p>
							<p class="text-xs text-muted-foreground truncate">
								Form: {sub.formId.slice(0, 8)}...
							</p>
						</div>
						<div class="flex items-center gap-2">
							{#if sub.isSpam}
								<span class="text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded">Spam</span>
							{/if}
							<span class="text-xs text-muted-foreground">{timeAgo(sub.createdAt)}</span>
						</div>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">No submissions yet</p>
				{/each}
			</div>
		</Card>
	</div>
</div>
