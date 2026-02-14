<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import * as Card from '$lib/components/ui/card';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

	let mousePosition = $state({ x: 50, y: 50 });
	let isHovered = $state(false);
	let wrapperRef: HTMLDivElement;

	function handleMouseMove(e: MouseEvent) {
		if (!wrapperRef) return;

		const rect = wrapperRef.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;

		mousePosition = { x, y };
	}
</script>

<div
	bind:this={wrapperRef}
	role="presentation"
	onmousemove={handleMouseMove}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	class={cn("relative p-[1px] rounded-xl transition-all duration-300", className)}
	style="background: radial-gradient(circle 400px at {mousePosition.x}% {mousePosition.y}%, oklch(0.65 0.25 140 / {isHovered ? 0.8 : 0}), transparent);"
>
	<Card.Root bind:ref class="relative z-10 overflow-hidden h-full" {...restProps}>
		{@render children?.()}
	</Card.Root>
</div>
