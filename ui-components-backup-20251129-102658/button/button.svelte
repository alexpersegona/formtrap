<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: "relative overflow-hidden cursor-pointer focus-visible:border-ring focus-visible:ring-ring/50    aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 active:scale-95 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0  text-shadow-none",

		// text-base font-mono font-medium

		variants: {
			variant: {
				default:
					'bg-primary dark:bg-gradient-to-b from-primary-tint  to-primary  text-primary-foreground shadow-xs hover:bg-primary/90',
				destructive:
					'bg-destructive shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white',
				outline:
					'bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border',
				secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
				link: 'text-primary underline-offset-4 hover:underline',
				primary_outline:
					'bg-background text-primary shadow-xs hover:bg-primary/10 dark:bg-input/30 dark:hover:bg-primary/20 border border-primary',
				// fancy: "bg-gradient-to-b from-primary to-primary text-primary-foreground shadow-xs hover:shadow-[0_0_8px_oklch(from_var(--primary)_l_c_h_/_0.5)] dark:hover:shadow-[0_0_12px_oklch(from_var(--primary)_l_c_h_/_0.6)]",
				fancy:
					' bg-gradient-to-b dark:from-primary from-primary-tint to-primary-shade dark:to-primary-shade text-white shadow-xs hover:shadow-[0_0_8px_oklch(from_var(--primary)_l_c_h_/_0.5)] dark:hover:shadow-[0_0_5px_oklch(from_var(--primary)_l_c_h_/_0.5)] text-shadow-md',
				glass:
					'glass-border h-12 px-8 py-3 bg-gradient-to-b dark:from-primary/35 dark:to-primary/45 from-primary-tint/80 via-primary/50 to-primary-tint/80 backdrop-blur-sm border-0 text-foreground shadow-lg hover:scale-[103%] hover:shadow-xl hover:bg-primary/90 transition-all duration-300 text-[oklch(from_var(--primary-shade)_calc(l_-_0.3)_calc(c_-_0.1)_calc(h_-_0)_/_0.8)] dark:text-foreground',
				glass2:
					'glass-border-slide  h-12 px-8 py-3 backdrop-blur-[20px] border-0 text-foreground shadow-lg hover:scale-[103%] hover:shadow-xl hover:bg-primary/90 transition-all duration-300 text-[oklch(from_var(--primary-shade)_calc(l_-_0.3)_calc(c_-_0.1)_calc(h_-_0)_/_0.8)] dark:text-foreground'
			},
			size: {
				default: 'h-9 px-4 py-2 has-[>svg]:px-3',
				sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
				lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
				icon: 'size-9',
				'icon-sm': 'size-8',
				'icon-lg': 'size-10'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			tracking?: boolean;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		tracking = false,
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();

	let ripples = $state<Array<{ id: number; x: number; y: number; size: number }>>([]);

	// Mouse tracking state
	let mousePosition = $state({ x: 50, y: 50 });
	let isHovered = $state(false);

	function handleMouseMove(e: MouseEvent) {
		if (!ref) return;

		const rect = ref.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;

		mousePosition = { x, y };
	}

	function handleRippleClick(e: MouseEvent) {
		if (disabled) return;

		const target = e.currentTarget as HTMLElement;
		if (!target) return;

		const rect = target.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const size = Math.max(rect.width, rect.height);

		const rippleId = Date.now() + Math.random();
		const newRipple = { id: rippleId, x, y, size };

		ripples = [...ripples, newRipple];

		// Remove ripple after animation completes
		setTimeout(() => {
			ripples = ripples.filter((r) => r.id !== rippleId);
		}, 600);
	}

	// Get ripple color based on variant
	const rippleColor = $derived(() => {
		switch (variant) {
			case 'destructive':
				return 'rgba(255, 255, 255, 0.6)';
			case 'outline':
			case 'secondary':
			case 'ghost':
				return 'rgba(0, 0, 0, 0.7)';
			case 'primary_outline':
				return 'oklch(from var(--primary) l c h / 0.4)';
			case 'fancy':
				return 'oklch(from var(--primary) calc(l + 0.3) calc(c * 0.5) h / 0.5)';
			case 'glass':
				return 'oklch(from var(--primary) calc(l + 0.2) calc(c * 0.8) h / 0.4)';
			case 'glass2':
				return 'oklch(from var(--primary) calc(l + 0.2) calc(c * 0.8) h / 0.4)';
			default:
				return 'rgba(255, 255, 255, 0.4)';
		}
	});

	// Get tracking gradient colors for light mode
	// Uses CSS relative color syntax to derive from semantic colors
	const trackingColorLight = $derived(() => {
		switch (variant) {
			case 'default':
				// Darken and slightly desaturate for light backgrounds
				return 'oklch(from var(--primary) calc(l + 0.5) calc(c + 0.1) h / 0.4)';
			case 'destructive':
				// Darken destructive color for light backgrounds
				return 'oklch(from var(--destructive) calc(l + 0.50) calc(c * 0.9) h / 0.30)';
			case 'outline':
				return 'oklch(from var(--accent) calc(l - 0.2) c h / .3)';
			case 'ghost':
				// Darker foreground for light backgrounds
				return 'oklch(from var(--foreground) calc(l - 0.3) c h / 0.08)';
			case 'secondary':
				// Darken secondary slightly
				return 'oklch(from var(--secondary) calc(l - 0.05) calc(c * 0.7) h / .9)';
			case 'link':
				return 'transparent';
			case 'primary_outline':
				// Use primary color with low opacity
				return 'oklch(from var(--primary) l c h / 0.1)';
			case 'fancy':
				// Matches EmeraldButton lighter variant's radialLight
				return 'oklch(0.80 0.20 150 / 0.8)';
			case 'glass':
				// Brighten primary for glassmorphism effect
				return 'oklch(from var(--primary) calc(l + 0.3) calc(c * 1.1) h / 0.5)';
			case 'glass2':
				// Brighten primary for glassmorphism effect
				return 'oklch(from var(--primary) calc(l + 0.3) calc(c * 1.1) h / 0.5)';
			default:
				return 'oklch(from var(--foreground) calc(l - 0.3) c h / 0.08)';
		}
	});

	// Get tracking gradient colors for dark mode
	const trackingColorDark = $derived(() => {
		switch (variant) {
			case 'default':
				// Lighten and desaturate for dark backgrounds
				return 'oklch(from var(--primary) calc(l + 0.5) calc(c * 0.23) h / 0.6)';
			case 'destructive':
				// Lighten destructive color for dark backgrounds
				return 'oklch(from var(--destructive) calc(l + 0.15) calc(c * 0.5) h / 0.2)';
			case 'outline':
			case 'ghost':
				// Lighter foreground for dark backgrounds
				return 'oklch(from var(--foreground) calc(l + 0.1) calc(c * 0.5) h / 0.08)';
			case 'secondary':
				// Lighten secondary for dark backgrounds
				return 'oklch(from var(--secondary) calc(l + 0.15) calc(c * 0.6) h / 0.25)';
			case 'link':
				return 'transparent';
			case 'primary_outline':
				// Brighten primary for dark backgrounds
				return 'oklch(from var(--primary) calc(l + 0.15) c h / 0.15)';
			case 'fancy':
				// Matches EmeraldButton lighter variant's radialDark
				return 'oklch(from var(--primary) 1 0.13 150 / 0.4)';
			case 'glass':
				// Enhanced brightness for dark mode glassmorphism
				return 'oklch(from var(--primary) calc(l + 0.5) calc(c + .3) calc(h - 22) / 0.3)';
			case 'glass2':
				// Enhanced brightness for dark mode glassmorphism
				return 'oklch(from var(--primary) calc(l + 0.5) calc(c + .3) calc(h - 22) / 0.3)';
			default:
				return 'oklch(from var(--foreground) calc(l + 0.1) calc(c + .3) calc(h - 22) / 0.08)';
		}
	});
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		onclick={handleRippleClick}
		onmousemove={tracking ? handleMouseMove : undefined}
		onmouseenter={tracking ? () => (isHovered = true) : undefined}
		onmouseleave={tracking ? () => (isHovered = false) : undefined}
		{...restProps}
	>
		{#each ripples as ripple (ripple.id)}
			<span
				class="ripple-effect"
				style="
					left: {ripple.x - ripple.size / 2}px;
					top: {ripple.y - ripple.size / 2}px;
					width: {ripple.size}px;
					height: {ripple.size}px;
					background: {rippleColor()};
				"
			></span>
		{/each}
		{#if tracking}
			<!-- Light mode tracking gradient -->
			<span
				class="pointer-events-none absolute inset-0 transition-opacity duration-300 dark:hidden"
				style="background: radial-gradient(circle 120px at {mousePosition.x}% {mousePosition.y}%, {trackingColorLight()}, transparent); opacity: {isHovered
					? 1
					: 0};"
			></span>
			<!-- Dark mode tracking gradient -->
			<span
				class="pointer-events-none absolute inset-0 hidden transition-opacity duration-300 dark:block"
				style="background: radial-gradient(circle 120px at {mousePosition.x}% {mousePosition.y}%, {trackingColorDark()}, transparent); opacity: {isHovered
					? 1
					: 0};"
			></span>
		{/if}
		<span class="relative z-10 inline-flex items-center justify-center gap-2">
			{@render children?.()}
		</span>
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		onclick={handleRippleClick}
		onmousemove={tracking ? handleMouseMove : undefined}
		onmouseenter={tracking ? () => (isHovered = true) : undefined}
		onmouseleave={tracking ? () => (isHovered = false) : undefined}
		{...restProps}
	>
		{#each ripples as ripple (ripple.id)}
			<span
				class="ripple-effect"
				style="
					left: {ripple.x - ripple.size / 2}px;
					top: {ripple.y - ripple.size / 2}px;
					width: {ripple.size}px;
					height: {ripple.size}px;
					background: {rippleColor()};
				"
			></span>
		{/each}
		{#if tracking}
			<!-- Light mode tracking gradient -->
			<span
				class="pointer-events-none absolute inset-0 transition-opacity duration-300 dark:hidden"
				style="background: radial-gradient(circle 120px at {mousePosition.x}% {mousePosition.y}%, {trackingColorLight()}, transparent); opacity: {isHovered
					? 1
					: 0};"
			></span>
			<!-- Dark mode tracking gradient -->
			<span
				class="pointer-events-none absolute inset-0 hidden transition-opacity duration-300 dark:block"
				style="background: radial-gradient(circle 120px at {mousePosition.x}% {mousePosition.y}%, {trackingColorDark()}, transparent); opacity: {isHovered
					? 1
					: 0};"
			></span>
		{/if}
		<span class="relative z-10 inline-flex items-center justify-center gap-2">
			{@render children?.()}
		</span>
	</button>
{/if}

<style>
	:global(.glass-border),
	:global(.glass-border-slide) {
		--border-offset: 2px;
	}

	.ripple-effect {
		position: absolute;
		border-radius: 50%;
		transform: scale(0);
		animation: ripple-animation 0.6s ease-out;
		pointer-events: none;
		z-index: 1;
	}

	@keyframes ripple-animation {
		0% {
			transform: scale(0);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 0;
		}
	}

	@keyframes spin-slow {
		to {
			transform: rotate(1turn);
		}
	}

	/* Glass variant with animated conic gradient border */
	/* Rotating gradient background */
	:global(.glass-border::before) {
		content: '';
		position: absolute;
		z-index: -2;
		left: -50%;
		top: -50%;
		width: 200%;
		height: 200%;
		background-image: conic-gradient(
			from 0deg,
			oklch(from var(--primary) calc(l + 0.8) calc(c * 1.2) h / 0.8),
			oklch(from var(--primary) calc(l - 0.1) calc(c * 0.8) h / 0.8),
			oklch(from var(--primary) calc(l + 0.8) calc(c * 1.2) h / 0.8)
		);
		/* animation: spin-slow 3s linear infinite;  */
		 /* filter: blur(8px); */
	}

	:global(.glass-border::after) {
		content: '';
		position: absolute;
		z-index: -1;
		left: calc(var(--border-offset) / 2);
		top: calc(var(--border-offset) / 2);
		width: calc(100% - var(--border-offset));
		height: calc(100% - var(--border-offset));
		background: oklch(from var(--primary) calc(l + 0.3) calc(c - 0.09) h);
		border-radius: calc(0.5rem - 2px);
		transition: background 300ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.dark .glass-border:before) {
		background-image: conic-gradient(
			from 0deg,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.2) h / 0.8),
			oklch(from var(--primary) calc(l - 0.1) calc(c * 0.8) h / 0.4),
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.2) h / 0.8)
		);
	}
	

	:global(.dark .glass-border:after) {
		/* background gradient downward */
		background: linear-gradient(to top, oklch(from var(--primary) calc(l - 0.3) calc(c * 0.8) h / 0.8), oklch(from var(--primary) calc(l - 0.2) calc(c * 1.2) h / 0.8));
		transition: background 300ms cubic-bezier(0.4, 0, 0.2, 1);
	}


	/* Glass2 variant with sliding gradient border */
	@keyframes slide-gradient {
		to {
			transform: translateX(-50%);
		}
	}

	/* SLIDE GLASS BORDER */
	:global(.glass-border-slide::before) {
		content: '';
		position: absolute;
		z-index: -2;
		left: 0;
		top: 0;
		width: 400%;
		height: 100%;
		background: linear-gradient(
			135deg,
			oklch(from var(--primary) calc(l + 0.35) calc(c * 1.4) h / .8) 0%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.2) h / 0.65) 12.5%,
			oklch(from var(--primary) calc(l - 0.25) calc(c * 1.6) h / 0.5) 25%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.2) h / 0.65) 37.5%,
			oklch(from var(--primary) calc(l + 0.35) calc(c * 1.4) h / .8) 50%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.2) h / 0.65) 62.5%,
			oklch(from var(--primary) calc(l - 0.25) calc(c * 1.6) h / 0.5) 75%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.2) h / 0.65) 87.5%,
			oklch(from var(--primary) calc(l + 0.35) calc(c * 1.4) h / .8) 100%
		);
		background-size: 50% 100%;
		animation: slide-gradient 4.2s linear infinite;
		filter: blur(3px);
	}

	:global(.glass-border-slide::after) {
		content: '';
		position: absolute;
		z-index: -1;
		left: calc(var(--border-offset) / 2);
		top: calc(var(--border-offset) / 2);
		width: calc(100% - var(--border-offset));
		height: calc(100% - var(--border-offset));
		background: oklch(from var(--primary) calc(l + 0.4) calc(c * 0.5) h / 0.9);
		border-radius: calc(0.5rem - 2px);
	}

	:global(.dark .glass-border-slide::after) {
		background: oklch(from var(--primary) calc(l - 0.3) calc(c - 0.09) h);
	}


</style>
