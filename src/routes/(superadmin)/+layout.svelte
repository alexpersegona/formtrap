<script lang="ts">
	import { page } from '$app/stores';
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { getImageUrl } from '$lib/types/images';
	import {
		LayoutDashboard,
		Users,
		Building2,
		FileText,
		Mail,
		Activity,
		LogOut,
		Settings,
		Shield,
		ChevronLeft,
		ChevronRight,
		Menu,
		X,
		ScrollText,
		ListTodo
	} from '@lucide/svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Sidebar state
	let sidebarCollapsed = $state(false);
	let mobileSidebarOpen = $state(false);

	const navItems = [
		{ href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/superadmin/users', label: 'Users', icon: Users },
		{ href: '/superadmin/spaces', label: 'Spaces', icon: Building2 },
		{ href: '/superadmin/forms', label: 'Forms', icon: FileText },
		{ href: '/superadmin/contact', label: 'Contact', icon: Mail },
		{ href: '/superadmin/audit', label: 'Audit', icon: ScrollText },
		{ href: '/superadmin/jobs', label: 'Jobs', icon: ListTodo },
		{ href: '/superadmin/system', label: 'System', icon: Activity }
	];

	function isActive(href: string) {
		if (href === '/superadmin') {
			return $page.url.pathname === '/superadmin';
		}
		return $page.url.pathname.startsWith(href);
	}

	function toggleCollapse() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	function toggleMobileSidebar() {
		mobileSidebarOpen = !mobileSidebarOpen;
	}

	function closeMobileSidebar() {
		mobileSidebarOpen = false;
	}

	async function handleLogout() {
		await signOut();
		goto('/');
	}

	const avatarUrl = $derived(getImageUrl(data.user?.image, 'thumbnail'));
</script>

<div class="flex min-h-screen flex-col bg-background">
	<!-- Top Bar -->
	<header
		class="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<div class="h-full px-4 flex items-center justify-between gap-4">
			<!-- Left: Mobile Menu + Logo -->
			<div class="flex items-center gap-4">
				<!-- Hamburger Menu (Mobile only) -->
				<button
					onclick={toggleMobileSidebar}
					class="md:hidden flex items-center justify-center w-8 h-8"
					aria-label={mobileSidebarOpen ? 'Close menu' : 'Open menu'}
				>
					{#if mobileSidebarOpen}
						<X class="h-6 w-6" />
					{:else}
						<Menu class="h-6 w-6" />
					{/if}
				</button>

				<!-- Logo -->
				<a href="/superadmin" class="flex items-center gap-2">
					<Shield class="h-8 w-8 text-red-500" />
					<span class="text-xl font-bold hidden sm:block">Superadmin</span>
				</a>
			</div>

			<!-- Right: Theme Toggle + User Menu -->
			<div class="flex items-center gap-2">
				<a href="/dashboard">
					<Button variant="outline" size="sm">Back to App</Button>
				</a>

				<ThemeToggle />

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								class="relative h-8 w-8 rounded-full p-0 flex items-center justify-center"
							>
								<Avatar.Root class="h-8 w-8">
									<Avatar.Image src={avatarUrl} alt={data.user.name} />
									<Avatar.Fallback>
										{data.user.name?.charAt(0) || 'S'}
									</Avatar.Fallback>
								</Avatar.Root>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-56" align="end">
						<div class="flex items-center justify-start gap-2 p-2">
							<div class="flex flex-col space-y-1 leading-none">
								<p class="font-medium">{data.user.name}</p>
								<p class="w-[200px] truncate text-sm text-muted-foreground">
									{data.user.email}
								</p>
								<p class="text-xs text-red-500 font-semibold">Superadmin</p>
							</div>
						</div>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => goto('/settings')}>
							<Settings class="mr-2 h-4 w-4" />
							<span>Settings</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={handleLogout}>
							<LogOut class="mr-2 h-4 w-4" />
							<span>Log out</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</header>

	<!-- Spacer for fixed header -->
	<div class="h-16"></div>

	<!-- Sidebar + Main Content -->
	<div class="flex flex-1">
		<!-- Mobile Overlay -->
		{#if mobileSidebarOpen}
			<div
				class="fixed inset-0 bg-black/50 z-40 md:hidden"
				onclick={closeMobileSidebar}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ' ? closeMobileSidebar() : null)}
				role="button"
				tabindex="-1"
			></div>
		{/if}

		<!-- Sidebar -->
		<aside
			class="fixed left-0 top-16 h-[calc(100vh-4rem)] bg-background border-r z-50 flex flex-col transition-[width,transform] duration-300
				{sidebarCollapsed ? 'w-16' : 'w-64'}
				{mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}"
		>
			<!-- Navigation -->
			<nav class="flex-1 overflow-y-auto py-4">
				<ul class="space-y-1 px-2">
					{#each navItems as item}
						<li>
							<a
								href={item.href}
								onclick={closeMobileSidebar}
								class="flex items-center rounded-md text-sm font-medium transition-all duration-300
									{sidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2'}
									{isActive(item.href)
									? 'bg-red-500/10 text-red-500'
									: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}"
							>
								<item.icon class="h-5 w-5 flex-shrink-0" />
								{#if !sidebarCollapsed}
									<span>{item.label}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<!-- Collapse Toggle (Desktop only) -->
			<div class="hidden md:flex border-t p-2">
				<button
					onclick={toggleCollapse}
					class="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
					aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				>
					{#if sidebarCollapsed}
						<ChevronRight class="h-5 w-5" />
					{:else}
						<ChevronLeft class="h-5 w-5" />
					{/if}
				</button>
			</div>
		</aside>

		<!-- Spacer for fixed sidebar (Desktop only) -->
		<div
			class="hidden md:block {sidebarCollapsed ? 'w-16' : 'w-64'} flex-shrink-0 transition-[width] duration-300"
		></div>

		<!-- Main Content Area -->
		<main class="flex-1 bg-background min-w-0">
			<div class="container mx-auto p-6">
				{@render children()}
			</div>
		</main>
	</div>
</div>
