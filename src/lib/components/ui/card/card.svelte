<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const cardVariants = tv({
		base: "flex flex-col gap-6 rounded-xl border py-[calc(var(--card-padding)*var(--root-scale))]",
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
		style,
		children,
		...restProps
	}: Props & { style?: string } = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-variant={variant}
	class={cn(cardVariants({ variant }), className)}
	style="--tw-shadow-color: hsl(var(--primary) / 0.4); {style || ''}"
	{...restProps}
>
	{@render children?.()}
</div>

