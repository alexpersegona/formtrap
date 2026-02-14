<script lang="ts">
	import { theme } from '$lib/stores/theme';
	import { Button } from '$lib/components/ui/button';
	import { Sun, Moon } from '@lucide/svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		theme.init();
	});

	// Determine if currently in dark mode (for system theme, check actual state)
	let isDark = $derived(
		$theme === 'dark' ||
			($theme === 'system' &&
				typeof window !== 'undefined' &&
				window.matchMedia('(prefers-color-scheme: dark)').matches)
	);

	function toggleTheme() {
		// If currently system, switch to explicit light/dark based on current state
		if ($theme === 'system') {
			theme.set(isDark ? 'light' : 'dark');
		} else {
			theme.toggle();
		}
	}
</script>

<Button
	variant="ghost"
	size="icon"
	class="h-9 w-9"
	aria-label="Toggle theme"
	onclick={toggleTheme}
>
	{#if isDark}
		<Moon class="h-4 w-4" />
	{:else}
		<Sun class="h-4 w-4" />
	{/if}
</Button>
