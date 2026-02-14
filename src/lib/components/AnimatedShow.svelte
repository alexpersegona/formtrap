<script lang="ts" module>
	export type AnimationType = 'slide' | 'fade' | 'fly' | 'scale' | 'slideX';
</script>

<script lang="ts">
	import { slide, fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Snippet } from 'svelte';
	import type { TransitionConfig } from 'svelte/transition';

	interface Props {
		when: boolean;

		// Simple mode: same animation in/out
		animation?: AnimationType;
		duration?: number;

		// Advanced mode: different in/out animations
		inAnimation?: AnimationType;
		outAnimation?: AnimationType;
		inDuration?: number;
		outDuration?: number;

		children: Snippet;
	}

	let {
		when,
		animation = 'slide',
		duration = 300,
		inAnimation,
		outAnimation,
		inDuration,
		outDuration,
		children
	}: Props = $props();

	// Check for reduced motion
	const prefersReducedMotion = $derived(
		typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);

	// Use specific in/out animations if provided, otherwise use common animation
	const effectiveInAnimation = $derived(inAnimation ?? animation);
	const effectiveOutAnimation = $derived(outAnimation ?? animation);
	const effectiveInDuration = $derived(prefersReducedMotion ? 0 : inDuration ?? duration);
	const effectiveOutDuration = $derived(prefersReducedMotion ? 0 : outDuration ?? duration);

	// Custom transitions that combine visual effects with height animation
	// Height animates longer (1.4x duration) for smoother exit
	// NOTE: We don't animate margins to avoid conflicts with parent spacing (space-y, gap, etc)
	function fadeSlide(
		node: HTMLElement,
		{ duration, delay = 0 }: { duration: number; delay?: number }
	): TransitionConfig {
		const style = getComputedStyle(node);
		const opacity = +style.opacity;
		const height = parseFloat(style.height);
		const paddingTop = parseFloat(style.paddingTop);
		const paddingBottom = parseFloat(style.paddingBottom);

		return {
			delay,
			duration: duration * 1.4, // Height takes longer
			easing: cubicOut,
			css: (t) => {
				// Opacity finishes at 71% of total duration (1/1.4 ≈ 0.71)
				const visualProgress = Math.min(t * 1.4, 1);
				return `
					opacity: ${visualProgress * opacity};
					height: ${t * height}px;
					padding-top: ${t * paddingTop}px;
					padding-bottom: ${t * paddingBottom}px;
					overflow: hidden;
				`;
			}
		};
	}

	function scaleSlide(
		node: HTMLElement,
		{ duration, delay = 0, start = 0.9 }: { duration: number; delay?: number; start?: number }
	): TransitionConfig {
		const style = getComputedStyle(node);
		const opacity = +style.opacity;
		const height = parseFloat(style.height);
		const paddingTop = parseFloat(style.paddingTop);
		const paddingBottom = parseFloat(style.paddingBottom);

		return {
			delay,
			duration: duration * 1.4, // Height takes longer
			easing: cubicOut,
			css: (t) => {
				// Visual effects finish at 71% of total duration
				const visualProgress = Math.min(t * 1.4, 1);
				const scaleValue = start + (1 - start) * visualProgress;
				return `
					transform: scale(${scaleValue});
					opacity: ${visualProgress * opacity};
					height: ${t * height}px;
					padding-top: ${t * paddingTop}px;
					padding-bottom: ${t * paddingBottom}px;
					overflow: hidden;
				`;
			}
		};
	}

	function flySlide(
		node: HTMLElement,
		{ duration, delay = 0, y = -20 }: { duration: number; delay?: number; y?: number }
	): TransitionConfig {
		const style = getComputedStyle(node);
		const opacity = +style.opacity;
		const height = parseFloat(style.height);
		const paddingTop = parseFloat(style.paddingTop);
		const paddingBottom = parseFloat(style.paddingBottom);

		return {
			delay,
			duration: duration * 1.4, // Height takes longer
			easing: cubicOut,
			css: (t) => {
				// Visual effects finish at 71% of total duration
				const visualProgress = Math.min(t * 1.4, 1);
				return `
					transform: translateY(${(1 - visualProgress) * y}px);
					opacity: ${visualProgress * opacity};
					height: ${t * height}px;
					padding-top: ${t * paddingTop}px;
					padding-bottom: ${t * paddingBottom}px;
					overflow: hidden;
				`;
			}
		};
	}

	function slideXSlide(
		node: HTMLElement,
		{ duration, delay = 0, x = -100 }: { duration: number; delay?: number; x?: number }
	): TransitionConfig {
		const style = getComputedStyle(node);
		const opacity = +style.opacity;
		const height = parseFloat(style.height);
		const paddingTop = parseFloat(style.paddingTop);
		const paddingBottom = parseFloat(style.paddingBottom);

		return {
			delay,
			duration: duration * 1.4, // Height takes longer
			easing: cubicOut,
			css: (t) => {
				// Visual effects finish at 71% of total duration
				const visualProgress = Math.min(t * 1.4, 1);
				return `
					transform: translateX(${(1 - visualProgress) * x}px);
					opacity: ${visualProgress * opacity};
					height: ${t * height}px;
					padding-top: ${t * paddingTop}px;
					padding-bottom: ${t * paddingBottom}px;
					overflow: hidden;
				`;
			}
		};
	}

	// Transition configurations
	const transitionConfigs = {
		slide: (dur: number) => ({ duration: dur, easing: cubicOut }),
		fade: (dur: number) => ({ duration: dur }),
		fly: (dur: number) => ({ y: -20, duration: dur, easing: cubicOut }),
		scale: (dur: number) => ({ start: 0.9, duration: dur, easing: cubicOut }),
		slideX: (dur: number) => ({ x: -100, duration: dur, easing: cubicOut })
	};

	const inConfig = $derived(transitionConfigs[effectiveInAnimation](effectiveInDuration));
	const outConfig = $derived(transitionConfigs[effectiveOutAnimation](effectiveOutDuration));

	// Map to transition functions
	// For IN: use standard transitions
	// For OUT: use combined transitions that include height animation
	const inTransitions = { slide, fade, fly, scale, slideX: fly };
	const outTransitions = {
		slide,
		fade: fadeSlide,
		fly: flySlide,
		scale: scaleSlide,
		slideX: slideXSlide
	};

	const inTransition = $derived(inTransitions[effectiveInAnimation]);
	const outTransition = $derived(outTransitions[effectiveOutAnimation]);
</script>

{#if when}
	<div in:inTransition={inConfig} out:outTransition={outConfig}>
		{@render children()}
	</div>
{/if}
