<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import { setContext } from 'svelte';
	import { writable } from 'svelte/store';

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		...restProps
	}: TabsPrimitive.RootProps = $props();

	// Create a store for the active tab value so triggers can reactively track it
	const activeValue = writable(value);

	// Update the store when value changes
	$effect(() => {
		activeValue.set(value);
	});

	// Pass active value to child components via context
	setContext('tabs-active-value', activeValue);
</script>

<TabsPrimitive.Root
	bind:ref
	bind:value
	data-slot="tabs"
	class={cn("flex flex-col gap-2", className)}
	{...restProps}
/>
