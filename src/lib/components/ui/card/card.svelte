<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const cardVariants = tv({
		base: "flex flex-col gap-6 rounded-xl border py-[calc(var(--card-padding)*var(--root-scale))] duration-500",
		variants: {
			variant: {
				default: "bg-card text-card-foreground shadow-sm",
				muted: "bg-muted text-muted-foreground border-border/50 shadow-none",
				info: "bg-info text-info-foreground border-info/20 shadow-none"
			}
		},
		defaultVariants: {
			variant: "default"
		}
	});

	export type CardVariant = VariantProps<typeof cardVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		variant?: CardVariant;
	}

	let {
		ref = $bindable(null),
		class: className,
		variant = 'default',
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-variant={variant}
	class={cn(cardVariants({ variant }), className)}
	style="--tw-shadow-color: hsl(var(--primary) / 0.4);"
	{...restProps}
>
	{@render children?.()}
</div>

<style>
	[data-slot="card"] {
		transition: box-shadow 500ms;
	}

	/* Only apply hover effect to default variant */
	:global [data-slot="card"][data-variant="default"]:hover {
		box-shadow: 0 0 7px oklch(from var(--primary) l c h / 0.2);
	}

	:global(.dark) [data-slot="card"][data-variant="default"]:hover {
		box-shadow: 0 0 7px oklch(from var(--primary) l c h / 0.2);
	}
</style>
