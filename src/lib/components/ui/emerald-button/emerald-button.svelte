<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
		onclick?: () => void;
		variant?: 'default' | 'darker' | 'light' | 'lighter';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		href?: string;
	}

	let {
		children,
		class: className,
		onclick,
		variant = 'default',
		type = 'button',
		disabled = false,
		href = undefined
	}: Props = $props();

	let mousePosition = $state({ x: 50, y: 50 });
	let isHovered = $state(false);
	let elementRef = $state<HTMLButtonElement | HTMLAnchorElement>();
	let ripples = $state<Array<{ id: number; x: number; y: number; size: number }>>([]);

	function handleMouseMove(e: MouseEvent) {
		if (!elementRef) return;

		const rect = elementRef.getBoundingClientRect();
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
			ripples = ripples.filter(r => r.id !== rippleId);
		}, 600);
	}

	const colorSchemes = {
		default: {
			gradient: 'from-emerald-800 to-emerald-950',
			glow: 'hover:shadow-[0_0_7px_rgba(16,185,129,0.4)]',
			radialLight: 'rgba(16, 185, 129, 0.4)',
			radialDark: 'rgba(16, 185, 129, 0.4)',
			rippleColor: 'rgba(16, 185, 129, 0.5)',
			textColor: 'text-white'
		},
		darker: {
			gradient: 'from-emerald-950 via-black to-[#011a0e]',
			glow: 'hover:shadow-[0_0_20px_rgba(5,150,105,0.3)]',
			radialLight: 'rgba(5, 150, 105, 0.35)',
			radialDark: 'rgba(5, 150, 105, 0.35)',
			rippleColor: 'rgba(16, 185, 129, 0.5)',
			textColor: 'text-white'
		},
		light: {
			gradient: 'from-[oklch(65%_0.15_155)] to-[oklch(57%_0.20_155)]',
			glow: 'hover:shadow-[0_0_5px_oklch(93%_0.24_155/0.5)]',
			radialLight: 'oklch(98% 0.13 155 / 0.6)',
			radialDark: 'oklch(98% 0.13 155 / 0.6)',
			rippleColor: 'oklch(95% 0.20 155 / 0.5)',
			textColor: 'text-white '
		},
		lighter: {
			gradient: 'from-primary to-primary',
			glow: 'hover:shadow-[0_0_4px_oklch(0.57_0.20_150/0.4)] dark:hover:shadow-[0_0_7px_oklch(93%_0.24_155/0.5)]',
			radialLight: 'oklch(0.80 0.20 150 / 0.8)',  // Subtle green in light mode
			radialDark: 'oklch(1 0.13 150 / 0.8)',   // Brighter emerald in dark mode
			rippleColor: 'oklch(1 0.10 150 / 0.5)',
			textColor: 'text-primary-foreground text-shadow-sm'
		}
	};

	const colors = $derived(colorSchemes[variant]);

	const sharedClasses = $derived(cn(
		'relative px-4 py-2 rounded-md font-semibold text-sm overflow-hidden flex items-center justify-center',
		colors.textColor,
		`bg-gradient-to-b ${colors.gradient}`,
		'transition-all duration-300',
		colors.glow,
		'active:scale-95',
		disabled && 'opacity-50 cursor-not-allowed',
		className
	));

	const sharedProps = {
		onmousemove: handleMouseMove,
		onmouseenter: () => (isHovered = true),
		onmouseleave: () => (isHovered = false),
		onclick: (e: MouseEvent) => {
			handleRippleClick(e);
			onclick?.();
		}
	};
</script>

{#if href}
	<a
		bind:this={elementRef}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...sharedProps}
		class={sharedClasses}
	>
		<!-- Light mode radial gradient -->
		<span
			class="absolute inset-0 transition-opacity duration-300 pointer-events-none dark:hidden"
			style="background: radial-gradient(circle 120px at {mousePosition.x}% {mousePosition.y}%, {colors.radialLight}, transparent); opacity: {isHovered ? 1 : 0};"
		></span>

		<!-- Dark mode radial gradient -->
		<span
			class="absolute inset-0 transition-opacity duration-300 pointer-events-none hidden dark:block"
			style="background: radial-gradient(circle 120px at {mousePosition.x}% {mousePosition.y}%, {colors.radialDark}, transparent); opacity: {isHovered ? 1 : 0};"
		></span>

		{#each ripples as ripple (ripple.id)}
			<span
				class="ripple-effect"
				style="
					left: {ripple.x - ripple.size / 2}px;
					top: {ripple.y - ripple.size / 2}px;
					width: {ripple.size}px;
					height: {ripple.size}px;
					background: {colors.rippleColor};
				"
			></span>
		{/each}

		<span class="relative z-10 pointer-events-none inline-flex items-center justify-center gap-2">
			{@render children()}
		</span>
	</a>
{:else}
	<button
		bind:this={elementRef}
		{type}
		{disabled}
		{...sharedProps}
		class={sharedClasses}
	>
		<!-- Light mode radial gradient -->
		<span
			class="absolute inset-0 transition-opacity duration-300 pointer-events-none dark:hidden"
			style="background: radial-gradient(circle 120px at {mousePosition.x}% {mousePosition.y}%, {colors.radialLight}, transparent); opacity: {isHovered ? 1 : 0};"
		></span>

		<!-- Dark mode radial gradient -->
		<span
			class="absolute inset-0 transition-opacity duration-300 pointer-events-none hidden dark:block"
			style="background: radial-gradient(circle 120px at {mousePosition.x}% {mousePosition.y}%, {colors.radialDark}, transparent); opacity: {isHovered ? 1 : 0};"
		></span>

		{#each ripples as ripple (ripple.id)}
			<span
				class="ripple-effect"
				style="
					left: {ripple.x - ripple.size / 2}px;
					top: {ripple.y - ripple.size / 2}px;
					width: {ripple.size}px;
					height: {ripple.size}px;
					background: {colors.rippleColor};
				"
			></span>
		{/each}

		<span class="relative z-10 pointer-events-none inline-flex items-center justify-center gap-2">
			{@render children()}
		</span>
	</button>
{/if}

<style>
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
</style>
