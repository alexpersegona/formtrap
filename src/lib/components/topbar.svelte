<script lang="ts">
	import { signOut, useSession } from '$lib/auth-client';
	import { getImageUrl } from '$lib/types/images';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { User, LogOut, Settings } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	
	interface Props {
		mobileOpen: boolean;
		onToggleMobile: () => void;
	}

	let { mobileOpen, onToggleMobile }: Props = $props();

	const session = useSession();

	// Use SSR user data to prevent layout shift during client navigation
	// Falls back to client session for non-protected routes
	const user = $derived($page.data?.user || $session.data?.user);

	// Get the thumbnail variant URL for the small topbar avatar
	const avatarUrl = $derived(getImageUrl(user?.image, 'thumbnail'));

	let dropdownOpen = $state(false);

	async function handleLogout() {
		dropdownOpen = false;
		await signOut();
		goto('/');
	}

	function handleNavigation(path: string) {
		dropdownOpen = false;
		goto(path);
	}
</script>

<header class="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="h-full px-4 flex items-center justify-between gap-4">
		<!-- Left: Mobile Menu + Logo -->
		<div class="flex items-center gap-4">
			<!-- Hamburger Menu (Mobile only) - Animated -->
			<button
				onclick={onToggleMobile}
				class="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
				aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
			>
				<span
					class="w-6 h-0.5 bg-foreground transition-all duration-300 {mobileOpen
						? 'rotate-45 translate-y-2'
						: ''}"
				></span>
				<span
					class="w-6 h-0.5 bg-foreground transition-all duration-300 {mobileOpen
						? 'opacity-0'
						: 'opacity-100'}"
				></span>
				<span
					class="w-6 h-0.5 bg-foreground transition-all duration-300 {mobileOpen
						? '-rotate-45 -translate-y-2'
						: ''}"
				></span>
			</button>

			<!-- Logo -->
			<a href="/dashboard" class="flex items-center space-x-2">
				<img src="/logo-symbol-2.svg" alt="FormTrap" class="h-8" />
				<span class="text-xl font-bold hidden sm:block">{PUBLIC_APP_NAME}</span>
			</a>
		</div>

		<!-- Right: Theme Toggle + User Menu -->
		<div class="flex items-center gap-2">
			<ThemeToggle />

			{#if user}
				<DropdownMenu.Root bind:open={dropdownOpen}>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" class="relative h-8 w-8 rounded-full p-0 flex items-center justify-center">
								<Avatar.Root class="h-8 w-8">
									<Avatar.Image src={avatarUrl} alt={user.name} />
									<Avatar.Fallback>
										{user.name?.charAt(0) || 'U'}
									</Avatar.Fallback>
								</Avatar.Root>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-56" align="end">
						<div class="flex items-center justify-start gap-2 p-2">
							<div class="flex flex-col space-y-1 leading-none">
								{#if user.name}
									<p class="font-medium">{user.name}</p>
								{/if}
								{#if user.email}
									<p class="w-[200px] truncate text-sm text-muted-foreground">
										{user.email}
									</p>
								{/if}
							</div>
						</div>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => handleNavigation('/profile')}>
							<User class="mr-2 h-4 w-4" />
							<span>Profile</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item onclick={() => handleNavigation('/settings')}>
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
			{/if}
		</div>
	</div>
</header>

<!-- Spacer for fixed header -->
<div class="h-16"></div>
