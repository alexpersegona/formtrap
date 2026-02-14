<script lang="ts">
	import { theme } from '$lib/stores/theme';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Sun, Moon, Monitor } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import type { Theme } from '$lib/stores/theme';

	let mounted = false;

	onMount(() => {
		mounted = true;
		theme.init();
	});

	function setTheme(newTheme: Theme) {
		theme.set(newTheme);
	}
</script>

{#if mounted}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button
				variant="ghost"
				size="icon"
				class="h-9 w-9"
				aria-label="Toggle theme"
			>
				{#if $theme === 'dark'}
					<Moon class="h-4 w-4" />
				{:else if $theme === 'light'}
					<Sun class="h-4 w-4" />
				{:else}
					<Monitor class="h-4 w-4" />
				{/if}
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Item onclick={() => setTheme('light')}>
				<Sun class="mr-2 h-4 w-4" />
				<span>Light</span>
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => setTheme('dark')}>
				<Moon class="mr-2 h-4 w-4" />
				<span>Dark</span>
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={() => setTheme('system')}>
				<Monitor class="mr-2 h-4 w-4" />
				<span>System</span>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
