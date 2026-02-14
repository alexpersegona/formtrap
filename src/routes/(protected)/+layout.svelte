<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/stores';
	import TopBar from '$lib/components/topbar.svelte';
	import Sidebar from '$lib/components/sidebar.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

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

	// Provide sidebar state to child pages via context
	setContext('sidebar', {
		get collapsed() {
			return sidebarCollapsed;
		},
		toggleCollapse
	});
</script>


<svelte:head>
	<link rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
	<!-- Top Bar -->
	<TopBar mobileOpen={mobileSidebarOpen} onToggleMobile={toggleMobileSidebar} />

	<!-- Sidebar + Main Content -->
	<div class="flex flex-1">
		<Sidebar
			collapsed={sidebarCollapsed}
			mobileOpen={mobileSidebarOpen}
			onToggleCollapse={toggleCollapse}
			onCloseMobile={closeMobileSidebar}
		/>

		<!-- Main Content Area -->
		<main class="flex-1 bg-background min-w-0">
			<!-- Page Header -->
			{#if $page.data.pageHeader}
				<PageHeader
					backHref={$page.data.pageHeader.backHref}
					backLabel={$page.data.pageHeader.backLabel}
				/>
			{:else}
				<PageHeader />
			{/if}

			<div class="container mx-auto p-6">
				{@render children()}
			</div>
		</main>
	</div>
</div>
