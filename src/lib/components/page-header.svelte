<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/stores';
	import SidebarToggle from './sidebar-toggle.svelte';
	import { Button } from './ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import * as Breadcrumb from './ui/breadcrumb';
	import * as DropdownMenu from './ui/dropdown-menu';
	import { Separator } from './ui/separator';

	interface Props {
		backHref?: string;
		backLabel?: string;
	}

	let { backHref, backLabel = 'Back' }: Props = $props();

	const sidebar = getContext<{ collapsed: boolean; toggleCollapse: () => void }>('sidebar');

	// Maximum breadcrumbs to show before collapsing (including first + last items)
	const ITEMS_TO_DISPLAY = 3;

	let dropdownOpen = $state(false);

	// Build breadcrumbs from current path
	const breadcrumbs = $derived(() => {
		const path = $page.url.pathname;
		const segments = path.split('/').filter(Boolean);
		const crumbs: { label: string; href: string }[] = [];

		// Always start with Dashboard
		crumbs.push({ label: 'Dashboard', href: '/dashboard' });

		// Build breadcrumbs based on segments
		let currentPath = '';
		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			currentPath += `/${segment}`;

			// Skip certain segments or customize labels
			if (segment === 'protected') continue;

			// Handle spaces
			if (segment === 'spaces') {
				// Add "Spaces" breadcrumb
				crumbs.push({ label: 'Spaces', href: '/spaces' });

				// If there's a space ID, add the space name
				if (i + 1 < segments.length) {
					const spaceId = segments[i + 1];
					// Try to get space name from page data
					const spaceName = $page.data?.space?.name || spaceId;
					crumbs.push({ label: spaceName, href: `/spaces/${spaceId}` });
					i++; // Skip the next segment (the ID)
					currentPath += `/${spaceId}`;
				}
			}
			// Handle forms list
			else if (segment === 'forms') {
				// Get space ID from page data or extract from path
			const spaceId = $page.data?.space?.id || segments[i - 1];
			crumbs.push({ label: 'Forms', href: `/spaces/${spaceId}?tab=forms` });

				// If there's a form ID next, add the form name
				if (i + 1 < segments.length && segments[i + 1] !== 'new') {
					const formId = segments[i + 1];
					// Try to get form name from page data
					const formName = $page.data?.form?.name || formId;
					crumbs.push({ label: formName, href: currentPath + `/${formId}` });
					i++; // Skip the next segment (the form ID)
					currentPath += `/${formId}`;
				}
			}
			// Handle other routes
			else if (segment === 'new') {
				crumbs.push({ label: 'New', href: currentPath });
			} else if (segment === 'edit') {
				crumbs.push({ label: 'Edit', href: currentPath });
			} else if (segment === 'settings') {
				crumbs.push({ label: 'Settings', href: currentPath });
			} else if (segment === 'invite') {
				crumbs.push({ label: 'Invite', href: currentPath });
			} else if (segment === 'pricing') {
				crumbs.push({ label: 'Pricing', href: currentPath });
			} else if (segment !== 'dashboard') {
				// Generic segment - skip form IDs as they're handled above
				// Only add if not already handled by specific cases
				if (!crumbs.some(c => c.href === currentPath)) {
					const label = segment.charAt(0).toUpperCase() + segment.slice(1);
					crumbs.push({ label, href: currentPath });
				}
			}
		}

		return crumbs;
	});
</script>

<!-- Page Header Band -->
<div class="border-b bg-background">
	<div class="px-6 mx-auto flex items-center justify-between gap-4 py-2 min-h-12">
		<!-- Left: Collapse Sidebar Button + Breadcrumbs -->
		<div class="flex items-center gap-3 min-w-0 flex-1">
			<SidebarToggle collapsed={sidebar.collapsed} onToggle={sidebar.toggleCollapse} />

			<!-- <div class="text-muted-foreground hidden sm:inline-flex items-center ">|</div> -->
			 <Separator orientation="vertical" class="hidden sm:block text-muted-foreground data-[orientation=vertical]:h-4" />

			<Breadcrumb.Root class="hidden sm:block">
				<Breadcrumb.List>
					{#if breadcrumbs().length > 0}
						<!-- Always show first item (Dashboard) -->
						<Breadcrumb.Item>
							<Breadcrumb.Link href={breadcrumbs()[0].href}>
								{breadcrumbs()[0].label}
							</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator />

						<!-- If we have more items than max, show dropdown with middle items -->
						{#if breadcrumbs().length > ITEMS_TO_DISPLAY}
							<Breadcrumb.Item>
								<DropdownMenu.Root bind:open={dropdownOpen}>
									<DropdownMenu.Trigger class="flex items-center gap-1" aria-label="Toggle menu">
										<Breadcrumb.Ellipsis class="size-4" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="start">
										{#each breadcrumbs().slice(1, -2) as crumb}
											<DropdownMenu.Item>
												<a href={crumb.href} class="w-full">
													{crumb.label}
												</a>
											</DropdownMenu.Item>
										{/each}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
						{/if}

						<!-- Show last items (ITEMS_TO_DISPLAY - 1) -->
						{@const lastItems =
							breadcrumbs().length > ITEMS_TO_DISPLAY
								? breadcrumbs().slice(-(ITEMS_TO_DISPLAY - 1))
								: breadcrumbs().slice(1)}
						{#each lastItems as crumb, index}
							<Breadcrumb.Item>
								{#if index === lastItems.length - 1}
									<!-- Last item is current page -->
									<Breadcrumb.Page class="max-w-40 truncate md:max-w-none">
										{crumb.label}
									</Breadcrumb.Page>
								{:else}
									<Breadcrumb.Link href={crumb.href} class="max-w-40 truncate md:max-w-none">
										{crumb.label}
									</Breadcrumb.Link>
									<Breadcrumb.Separator />
								{/if}
							</Breadcrumb.Item>
						{/each}
					{/if}
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>

		<!-- Right: Back Button (if provided) -->
		{#if backHref}
			<Button href={backHref} variant="ghost" size="sm" class="flex-shrink-0">
				<ArrowLeft class="h-4 w-4 sm:mr-2" />
				<span class="hidden sm:inline">{backLabel}</span>
			</Button>
		{/if}
	</div>
</div>
