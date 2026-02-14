<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		"bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-[calc(var(--card-padding)*var(--root-scale))] shadow-sm duration-500",
		className
	)}
	style="--tw-shadow-color: hsl(var(--primary) / 0.4);"
	{...restProps}
>
	{@render children?.()}
</div>

<style>
	[data-slot="card"] {
		transition: box-shadow 500ms;
	}

	:global [data-slot="card"]:hover {
		box-shadow: 0 0 7px oklch(from var(--primary) l c h / 0.2);
	}

	:global(.dark) [data-slot="card"]:hover {
		box-shadow: 0 0 7px oklch(from var(--primary) l c h / 0.2);
	}
</style>
