<script lang="ts">
	import { setContext } from 'svelte';
	import TopBar from '$lib/components/topbar.svelte';
	import Sidebar from '$lib/components/sidebar.svelte';
	import { ShieldCheck } from '@lucide/svelte';
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
		<main class="flex-1 overflow-x-hidden">
			<div class="container mx-auto p-6">
				<!-- Admin Badge -->
				<div class="mb-6 flex items-center gap-3 rounded-lg border border-orange-500/50 bg-orange-500/10 px-4 py-3">
					<ShieldCheck class="h-5 w-5 text-orange-600 dark:text-orange-400" />
					<div>
						<p class="font-semibold text-orange-900 dark:text-orange-100">Admin Panel</p>
						<p class="text-sm text-orange-700 dark:text-orange-300">You have elevated privileges</p>
					</div>
				</div>

				{@render children()}
			</div>
		</main>
	</div>
</div>
