<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import TopBar from '$lib/components/topbar.svelte';
	import Sidebar from '$lib/components/sidebar.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import { Button } from '$lib/components/ui/button';
	import { UserCog, X } from '@lucide/svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	let endingImpersonation = $state(false);

	async function endImpersonation() {
		endingImpersonation = true;
		try {
			await fetch('/api/impersonation/end', { method: 'POST' });
			// Redirect to superadmin area
			goto('/superadmin/users');
		} catch (error) {
			console.error('Failed to end impersonation:', error);
		}
		endingImpersonation = false;
	}

	// State management
	let sidebarCollapsed = $state(false);
	let mobileSidebarOpen = $state(false);

	function toggleCollapse() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	function toggleMobileSidebar() {
		mobileSidebarOpen = !mobileSidebarOpen;
	}

	function closeMobileSidebar() {
		mobileSidebarOpen = false;
	}
</script>


<svelte:head>
	<link rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
	<!-- Impersonation Banner -->
	{#if data.impersonation}
		<div class="fixed top-0 left-0 right-0 z-[60] bg-yellow-500 text-yellow-950">
			<div class="container mx-auto px-4 py-2 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<UserCog class="h-4 w-4" />
					<span class="text-sm font-medium">
						Viewing as <strong>{data.impersonation.targetUserName}</strong>
						<span class="hidden sm:inline">
							(logged in as {data.impersonation.superadminName})
						</span>
					</span>
				</div>
				<Button
					variant="ghost"
					size="sm"
					class="h-7 px-2 text-yellow-950 hover:bg-yellow-600 hover:text-yellow-950"
					onclick={endImpersonation}
					disabled={endingImpersonation}
				>
					{#if endingImpersonation}
						Ending...
					{:else}
						<X class="h-4 w-4 mr-1" />
						End Session
					{/if}
				</Button>
			</div>
		</div>
		<!-- Spacer for impersonation banner -->
		<div class="h-10"></div>
	{/if}

	<!-- Top Bar -->
	<TopBar
		mobileOpen={mobileSidebarOpen}
		onToggleMobile={toggleMobileSidebar}
		impersonating={!!data.impersonation}
	/>

	<!-- Sidebar + Main Content -->
	<div class="flex flex-1 min-h-0">
		<Sidebar
			collapsed={sidebarCollapsed}
			mobileOpen={mobileSidebarOpen}
			onToggleCollapse={toggleCollapse}
			onCloseMobile={closeMobileSidebar}
			impersonating={!!data.impersonation}
		/>

		<!-- Main Content Area -->
		<main class="flex-1 bg-background min-w-0 flex flex-col">
			<!-- Page Header -->
			{#if $page.data.pageHeader}
				<PageHeader
					backHref={$page.data.pageHeader.backHref}
					backLabel={$page.data.pageHeader.backLabel}
				/>
			{:else}
				<PageHeader />
			{/if}

			<div class="container mx-auto p-6 flex-1">
				{@render children()}
			</div>
		</main>
	</div>
</div>
