<script lang="ts">
	interface Props {
		height?: string;
		fade?: 'top' | 'bottom' | 'both';
		count?: number;
	}

	let { height, fade, count = 25 }: Props = $props();

	// Generate random firefly configs at build time
	const fireflies = Array.from({ length: count }, (_, i) => ({
		id: i,
		left: Math.random() * 100,
		top: Math.random() * 100,
		size: 20 + Math.random() * 40,
		delay: Math.random() * 8,
		duration: 3 + Math.random() * 4
	}));
</script>

<div
	class="firefly-container"
	style={height ? `position:absolute;height:${height}` : undefined}
>
	{#each fireflies as fly (fly.id)}
		<div
			class="firefly"
			style="
				left: {fly.left}%;
				top: {fly.top}%;
				width: {fly.size}px;
				height: {fly.size}px;
				animation-delay: {fly.delay}s;
				animation-duration: {fly.duration}s;
			"
		></div>
	{/each}
	{#if fade === 'top' || fade === 'both'}
		<div class="fade fade-top"></div>
	{/if}
	{#if fade === 'bottom' || fade === 'both'}
		<div class="fade fade-bottom"></div>
	{/if}
</div>

<style>
	.firefly-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}

	.firefly {
		position: absolute;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.3) h / 0.9) 0%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.1) h / 0.4) 40%,
			transparent 70%
		);
		opacity: 0;
		animation: firefly-glow 4s ease-in-out infinite;
	}

	:global(.dark) .firefly {
		background: radial-gradient(
			circle,
			oklch(from var(--primary) calc(l + 0.3) calc(c * 1.4) h / 1) 0%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.2) h / 0.5) 40%,
			transparent 70%
		);
	}

	@keyframes firefly-glow {
		0% {
			opacity: 0;
			transform: scale(5) translate(0, 0);
		}
		15% {
			opacity: 0;
		}
		30% {
			opacity: 0.8;
			transform: scale(7) translate(5px, -3px);
		}
		50% {
			opacity: 0.6;
			transform: scale(9) translate(-2px, 4px);
		}
		70% {
			opacity: 0.8;
			transform: scale(11) translate(3px, 2px);
		}
		85% {
			opacity: 0;
		}
		100% {
			opacity: 0;
			transform: scale(13) translate(0, 0);
		}
	}

	.fade {
		position: absolute;
		left: 0;
		width: 100%;
		height: 150px;
		z-index: 1;
		pointer-events: none;
	}

	.fade-top {
		top: 0;
		background: linear-gradient(to bottom, var(--background) 0%, transparent 100%);
	}

	.fade-bottom {
		bottom: 0;
		background: linear-gradient(to top, var(--background) 0%, transparent 100%);
	}
</style>
