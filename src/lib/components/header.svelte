<script lang="ts">
	import { signOut, useSession } from '$lib/auth-client';
	import { getImageUrl } from '$lib/types/images';
	import { Button } from '$lib/components/ui/button';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { User, LogOut, Settings, Menu, X, DollarSign, BookOpen } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { PUBLIC_APP_NAME } from '$env/static/public';

	const session = useSession();

	// Get the thumbnail variant URL for the small header avatar
	const avatarUrl = $derived(getImageUrl($session.data?.user?.image, 'thumbnail'));

	let mobileMenuOpen = $state(false);
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

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container mx-auto px-4">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo -->
			<div class="flex items-center">
				<a href="/" class="flex items-center space-x-2">
					<img src="/logo-symbol-2.svg" alt="FormTrap" class="h-8" />
					<span class="text-xl font-bold">{PUBLIC_APP_NAME}</span>
				</a>
			</div>

			<!-- Navigation Menu -->
			<NavigationMenu.Root class="hidden md:flex">
				<NavigationMenu.List>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="/pricing"
							data-active={$page.url.pathname === '/pricing'}
							class="flex-row items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium"
						>
							<DollarSign class="h-4 w-4" />
							Pricing
						</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="/docs"
							data-active={$page.url.pathname === '/docs'}
							class="flex-row items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium"
						>
							<BookOpen class="h-4 w-4" />
							Docs
						</NavigationMenu.Link>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>

			<!-- Right Side - Theme Toggle and Auth -->
			<div class="flex items-center space-x-4">
				<!-- Mobile Menu Button -->
				<Button
					variant="ghost"
					size="icon"
					class="md:hidden"
					onclick={toggleMobileMenu}
					aria-label="Toggle menu"
				>
					{#if mobileMenuOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</Button>

				<ThemeToggle />

				<Separator orientation="vertical" class="h-6 hidden md:block" />

				{#if $session.data?.user}
					<!-- Profile Dropdown -->
					<DropdownMenu.Root bind:open={dropdownOpen}>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" class="relative h-8 w-8 rounded-full">
									<Avatar.Root class="h-8 w-8">
										<Avatar.Image
											src={avatarUrl}
											srcset="{avatarUrl} 1x, {avatarUrl?.replace('.webp', '@2x.webp')} 2x"
											alt={$session.data.user.name}
										/>
										<Avatar.Fallback>
											{$session.data.user.name?.charAt(0) || 'U'}
										</Avatar.Fallback>
									</Avatar.Root>
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-56" align="end">
							<div class="flex items-center justify-start gap-2 p-2">
								<div class="flex flex-col space-y-1 leading-none">
									{#if $session.data.user.name}
										<p class="font-medium">{$session.data.user.name}</p>
									{/if}
									{#if $session.data.user.email}
										<p class="w-[200px] truncate text-sm text-muted-foreground">
											{$session.data.user.email}
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
				{:else}
					<!-- Login Button -->
					<a href="/login">
						<EmeraldButton variant="lighter">
							Login
						</EmeraldButton>
					</a>
				{/if}
			</div>
		</div>

		<!-- Mobile Navigation Menu -->
		{#if mobileMenuOpen}
			<div class="md:hidden border-t">
				<nav class="flex flex-col space-y-3 px-4 py-4">
					<a
						href="/pricing"
						data-active={$page.url.pathname === '/pricing'}
						class="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary data-[active=true]:text-primary"
						onclick={closeMobileMenu}
					>
						<DollarSign class="h-4 w-4" />
						Pricing
					</a>
					<a
						href="/docs"
						data-active={$page.url.pathname === '/docs'}
						class="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary data-[active=true]:text-primary"
						onclick={closeMobileMenu}
					>
						<BookOpen class="h-4 w-4" />
						Docs
					</a>
					{#if $session.data?.user}
						<Separator class="my-2" />
						<a
							href="/profile"
							data-active={$page.url.pathname === '/profile'}
							class="text-sm font-medium transition-colors hover:text-primary data-[active=true]:text-primary"
							onclick={closeMobileMenu}
						>
							Profile
						</a>
						<a
							href="/settings"
							data-active={$page.url.pathname === '/settings'}
							class="text-sm font-medium transition-colors hover:text-primary data-[active=true]:text-primary"
							onclick={closeMobileMenu}
						>
							Settings
						</a>
						<button
							class="text-sm font-medium transition-colors hover:text-primary text-left"
							onclick={() => {
								handleLogout();
								closeMobileMenu();
							}}
						>
							Log out
						</button>
					{/if}
				</nav>
			</div>
		{/if}
	</div>
</header>
