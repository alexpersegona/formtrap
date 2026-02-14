<script lang="ts">
	import { page } from '$app/stores';
	import { LayoutDashboard, FileText, Users, TestTube, BarChart3 } from '@lucide/svelte';

	interface Props {
		collapsed: boolean;
		mobileOpen: boolean;
		onToggleCollapse: () => void;
		onCloseMobile: () => void;
	}

	let { collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: Props = $props();

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/spaces', label: 'Spaces', icon: Users },
		{ href: '/forms', label: 'Forms', icon: FileText },
		{ href: '/usage', label: 'Usage', icon: BarChart3 },
		{ href: '/playground', label: 'Playground', icon: TestTube }
	];

	function isActive(href: string) {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}
</script>

<!-- Mobile Overlay -->
{#if mobileOpen}
	<div
		class="fixed inset-0 bg-black/50 z-40 md:hidden"
		onclick={onCloseMobile}
		onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? onCloseMobile() : null}
		role="button"
		tabindex="-1"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background border-r z-50 flex flex-col transition-[width,transform] duration-300
		{collapsed ? 'w-16' : 'w-64'}
		{mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}"
>
	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto py-4">
		<ul class="space-y-1 px-2">
			{#each navItems as item}
				<li>
					<a
						href={item.href}
						onclick={onCloseMobile}
						class="flex items-center rounded-md text-sm font-medium transition-all duration-300
							{collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
							{isActive(item.href)
								? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
								: 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}"
					>
						<item.icon class="h-5 w-5 flex-shrink-0" />
						{#if !collapsed}
							<span>{item.label}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</aside>

<!-- Spacer for fixed sidebar (Desktop only) -->
<div class="hidden md:block {collapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-[width] duration-300"></div>
