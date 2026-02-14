<script lang="ts">
	import { PinInput as InputOTPPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(""),
		children,
		...restProps
	}: InputOTPPrimitive.RootProps & {
		children?: Snippet<[{ cells: any[] }]>;
	} = $props();
</script>

<InputOTPPrimitive.Root
	bind:ref
	bind:value
	data-slot="input-otp"
	class={cn(
		"has-disabled:opacity-50 flex items-center gap-2 [&_input]:disabled:cursor-not-allowed",
		className
	)}
	{...restProps}
>
	{#snippet children(props)}
		{@render children?.(props)}
	{/snippet}
</InputOTPPrimitive.Root>
