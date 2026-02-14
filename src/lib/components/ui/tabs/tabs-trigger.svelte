<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	let {
		ref = $bindable(null),
		class: className,
		value,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();

	const variant = getContext<'default' | 'important'>('tabs-variant') ?? 'default';
	const indicatorStyle = getContext<Writable<{ width: number; left: number; opacity: number }>>('tabs-indicator');
	const activeValue = getContext<Writable<string>>('tabs-active-value');

	let triggerElement: HTMLElement | null = $state(null);
	let previousActive = $state(false);

	// Check if this trigger is currently active (reactively)
	const isActive = $derived(activeValue ? $state.snapshot(activeValue).valueOf() === value : false);

	// Update indicator position when this tab becomes active
	function updateIndicator() {
		if (variant === 'important' && triggerElement && indicatorStyle) {
			const rect = triggerElement.getBoundingClientRect();
			const parentRect = triggerElement.parentElement?.getBoundingClientRect();

			if (parentRect) {
				const newLeft = rect.left - parentRect.left;
				const newWidth = rect.width;

				indicatorStyle.set({
					width: newWidth,
					left: newLeft,
					opacity: 1
				});
			}
		}
	}

	// Watch for active state changes (reactive to activeValue store)
	$effect(() => {
		if (variant === 'important' && activeValue) {
			const currentActive = $activeValue === value;

			// Only update if transitioning from inactive to active
			if (currentActive && !previousActive && triggerElement) {
				// Small delay to ensure DOM is ready
				setTimeout(updateIndicator, 10);
			}

			previousActive = currentActive;
		}
	});

	// Initial position on mount
	onMount(() => {
		if (variant === 'important' && activeValue && $activeValue === value) {
			// Small delay to ensure layout is complete
			setTimeout(updateIndicator, 50);
		}
	});
</script>

<TabsPrimitive.Trigger
	bind:ref={triggerElement}
	{value}
	data-slot="tabs-trigger"
	class={cn(
		// Default variant (pill style)
		variant === 'default' && "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",

		// Important variant (underline style, no individual underlines now)
		variant === 'important' && "relative inline-flex items-center justify-center whitespace-nowrap px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=active]:font-semibold",

		className
	)}
	{...restProps}
/>
