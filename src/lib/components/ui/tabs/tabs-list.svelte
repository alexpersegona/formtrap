<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';
	import type { Snippet } from 'svelte';

	interface Props extends TabsPrimitive.ListProps {
		variant?: 'default' | 'important';
		children?: Snippet;
	}

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		children,
		...restProps
	}: Props = $props();

	// Create a writable store for the active tab indicator position
	// Start with opacity 0 instead of width 0 to prevent "restart" effect
	const indicatorStyle = writable({ width: 0, left: 0, opacity: 0 });

	// Pass variant, indicator store, and ref to triggers via context
	setContext('tabs-variant', variant);
	setContext('tabs-indicator', indicatorStyle);
	setContext('tabs-list-ref', () => ref);
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="tabs-list"
	data-variant={variant}
	class={cn(
		variant === 'default' && "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
		variant === 'important' && "relative inline-flex h-12 w-fit items-center gap-2 border-b border-border",
		className
	)}
	{...restProps}
>
	{@render children?.()}

	{#if variant === 'important'}
		<!-- Sliding indicator with spring bounce animation (matches Aceternity bounce: 0.3) -->
		<div
			class="absolute bottom-0 left-0 h-[2px] bg-primary will-change-transform"
			style="
				width: {$indicatorStyle.width}px;
				transform: translateX({$indicatorStyle.left}px);
				opacity: {$indicatorStyle.opacity};
				transition: transform 600ms cubic-bezier(0.34, 1.45, 0.64, 1), width 600ms cubic-bezier(0.34, 1.45, 0.64, 1), opacity 200ms ease-in-out;
			"
		></div>
	{/if}
</TabsPrimitive.List>
