<script lang="ts">
	interface Props {
		height?: string;
		fade?: 'top' | 'bottom' | 'both';
	}

	let { height, fade }: Props = $props();
</script>

<div
	class="aurora-container"
	style={height ? `position:absolute;height:${height}` : undefined}
>
	<div class="aurora-ray ray-1"></div>
	<div class="aurora-ray ray-2"></div>
	<div class="aurora-ray ray-gap gap-1"></div>
	<div class="aurora-ray ray-3"></div>
	<div class="aurora-ray ray-gap gap-2"></div>
	<div class="aurora-ray ray-4"></div>
	<div class="aurora-ray ray-5"></div>
	<div class="aurora-ray ray-gap gap-3"></div>
	<div class="aurora-ray ray-6"></div>
	{#if fade === 'top' || fade === 'both'}
		<div class="fade fade-top"></div>
	{/if}
	{#if fade === 'bottom' || fade === 'both'}
		<div class="fade fade-bottom"></div>
	{/if}
</div>

<style>
	.aurora-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}

	.aurora-ray {
		position: absolute;
		top: -50%;
		width: 25vw;
		height: 200%;
		opacity: 0.4;
		filter: blur(60px);
		will-change: transform, opacity;
		transform-origin: center center;
	}

	:global(.dark) .aurora-ray {
		opacity: 0.25;
	}

	.ray-1 {
		left: -5%;
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.4) h / 0.7) 20%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.2) calc(h + 20) / 0.5) 40%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.3) h / 0.8) 60%,
			transparent 80%
		);
		animation: aurora-sway-1 8s ease-in-out infinite, aurora-pulse-1 6s ease-in-out infinite;
	}

	.ray-2 {
		left: 15%;
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.1) calc(h - 15) / 0.6) 25%,
			oklch(from var(--primary) calc(l + 0.3) calc(c * 1.3) calc(h + 10) / 0.7) 50%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.2) h / 0.5) 70%,
			transparent 90%
		);
		animation: aurora-sway-2 10s ease-in-out infinite, aurora-pulse-2 7s ease-in-out infinite;
	}

	.ray-3 {
		left: 35%;
		background: linear-gradient(
			180deg,
			transparent 5%,
			oklch(from var(--primary) calc(l + 0.05) calc(c * 1.5) calc(h + 25) / 0.8) 30%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.2) h / 0.6) 55%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.4) calc(h - 10) / 0.7) 75%,
			transparent 95%
		);
		animation: aurora-sway-3 9s ease-in-out infinite, aurora-pulse-3 5s ease-in-out infinite;
	}

	.ray-4 {
		left: 55%;
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.3) calc(h + 30) / 0.6) 20%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.5) h / 0.8) 45%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.1) calc(h - 20) / 0.5) 70%,
			transparent 85%
		);
		animation: aurora-sway-4 11s ease-in-out infinite, aurora-pulse-4 8s ease-in-out infinite;
	}

	.ray-5 {
		left: 72%;
		background: linear-gradient(
			180deg,
			transparent 10%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.2) calc(h + 15) / 0.7) 30%,
			oklch(from var(--primary) calc(l + 0.3) calc(c * 1.4) h / 0.6) 55%,
			oklch(from var(--primary) calc(l + 0.05) calc(c * 1.3) calc(h - 25) / 0.8) 80%,
			transparent 95%
		);
		animation: aurora-sway-5 7s ease-in-out infinite, aurora-pulse-5 9s ease-in-out infinite;
	}

	.ray-6 {
		left: 88%;
		background: linear-gradient(
			180deg,
			transparent 5%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.5) calc(h + 10) / 0.5) 25%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.1) calc(h - 30) / 0.7) 50%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.3) h / 0.6) 75%,
			transparent 90%
		);
		animation: aurora-sway-6 12s ease-in-out infinite, aurora-pulse-6 6s ease-in-out infinite;
	}

	.ray-gap {
		background: linear-gradient(
			180deg,
			transparent 0%,
			var(--background) 20%,
			var(--background) 50%,
			var(--background) 80%,
			transparent 100%
		);
		opacity: 0.7;
		width: 30vw;
		filter: blur(80px);
	}

	:global(.dark) .ray-gap {
		opacity: 0.6;
	}

	.gap-1 {
		left: 8%;
		animation: aurora-sway-gap-1 14s ease-in-out infinite;
	}

	.gap-2 {
		left: 42%;
		animation: aurora-sway-gap-2 16s ease-in-out infinite;
	}

	.gap-3 {
		left: 68%;
		animation: aurora-sway-gap-3 13s ease-in-out infinite;
	}

	@keyframes aurora-sway-gap-1 {
		0%, 100% { transform: translateX(0) rotate(3deg) skewX(2deg); }
		25% { transform: translateX(10vw) rotate(-4deg) skewX(-3deg); }
		50% { transform: translateX(-5vw) rotate(5deg) skewX(4deg); }
		75% { transform: translateX(15vw) rotate(-3deg) skewX(-2deg); }
	}

	@keyframes aurora-sway-gap-2 {
		0%, 100% { transform: translateX(0) rotate(-4deg) skewX(-3deg); }
		25% { transform: translateX(-12vw) rotate(5deg) skewX(4deg); }
		50% { transform: translateX(8vw) rotate(-6deg) skewX(-5deg); }
		75% { transform: translateX(-8vw) rotate(3deg) skewX(2deg); }
	}

	@keyframes aurora-sway-gap-3 {
		0%, 100% { transform: translateX(0) rotate(5deg) skewX(3deg); }
		25% { transform: translateX(-15vw) rotate(-3deg) skewX(-4deg); }
		50% { transform: translateX(-5vw) rotate(6deg) skewX(5deg); }
		75% { transform: translateX(-20vw) rotate(-5deg) skewX(-3deg); }
	}

	@keyframes aurora-sway-1 {
		0%, 100% { transform: translateX(0) rotate(-8deg) skewX(-5deg); }
		25% { transform: translateX(15vw) rotate(5deg) skewX(3deg); }
		50% { transform: translateX(8vw) rotate(-3deg) skewX(-8deg); }
		75% { transform: translateX(20vw) rotate(8deg) skewX(5deg); }
	}

	@keyframes aurora-sway-2 {
		0%, 100% { transform: translateX(0) rotate(5deg) skewX(4deg); }
		25% { transform: translateX(-10vw) rotate(-8deg) skewX(-6deg); }
		50% { transform: translateX(12vw) rotate(10deg) skewX(8deg); }
		75% { transform: translateX(-5vw) rotate(-4deg) skewX(-3deg); }
	}

	@keyframes aurora-sway-3 {
		0%, 100% { transform: translateX(0) rotate(-3deg) skewX(-4deg); }
		25% { transform: translateX(18vw) rotate(8deg) skewX(6deg); }
		50% { transform: translateX(-8vw) rotate(-10deg) skewX(-8deg); }
		75% { transform: translateX(10vw) rotate(5deg) skewX(4deg); }
	}

	@keyframes aurora-sway-4 {
		0%, 100% { transform: translateX(0) rotate(6deg) skewX(5deg); }
		25% { transform: translateX(-15vw) rotate(-5deg) skewX(-7deg); }
		50% { transform: translateX(-20vw) rotate(8deg) skewX(6deg); }
		75% { transform: translateX(-8vw) rotate(-8deg) skewX(-4deg); }
	}

	@keyframes aurora-sway-5 {
		0%, 100% { transform: translateX(0) rotate(-5deg) skewX(-3deg); }
		25% { transform: translateX(-12vw) rotate(6deg) skewX(5deg); }
		50% { transform: translateX(5vw) rotate(-8deg) skewX(-6deg); }
		75% { transform: translateX(-18vw) rotate(10deg) skewX(8deg); }
	}

	@keyframes aurora-sway-6 {
		0%, 100% { transform: translateX(0) rotate(4deg) skewX(3deg); }
		25% { transform: translateX(-20vw) rotate(-7deg) skewX(-5deg); }
		50% { transform: translateX(-10vw) rotate(5deg) skewX(7deg); }
		75% { transform: translateX(-25vw) rotate(-6deg) skewX(-4deg); }
	}

	@keyframes aurora-pulse-1 {
		0%, 100% { opacity: 0.35; }
		50% { opacity: 0.6; }
	}

	@keyframes aurora-pulse-2 {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.55; }
	}

	@keyframes aurora-pulse-3 {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.65; }
	}

	@keyframes aurora-pulse-4 {
		0%, 100% { opacity: 0.25; }
		50% { opacity: 0.55; }
	}

	@keyframes aurora-pulse-5 {
		0%, 100% { opacity: 0.35; }
		50% { opacity: 0.6; }
	}

	@keyframes aurora-pulse-6 {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 0.55; }
	}

	:global(.dark) .ray-1 { animation: aurora-sway-1 8s ease-in-out infinite, aurora-pulse-dark-1 6s ease-in-out infinite; }
	:global(.dark) .ray-2 { animation: aurora-sway-2 10s ease-in-out infinite, aurora-pulse-dark-2 7s ease-in-out infinite; }
	:global(.dark) .ray-3 { animation: aurora-sway-3 9s ease-in-out infinite, aurora-pulse-dark-3 5s ease-in-out infinite; }
	:global(.dark) .ray-4 { animation: aurora-sway-4 11s ease-in-out infinite, aurora-pulse-dark-4 8s ease-in-out infinite; }
	:global(.dark) .ray-5 { animation: aurora-sway-5 7s ease-in-out infinite, aurora-pulse-dark-5 9s ease-in-out infinite; }
	:global(.dark) .ray-6 { animation: aurora-sway-6 12s ease-in-out infinite, aurora-pulse-dark-6 6s ease-in-out infinite; }

	@keyframes aurora-pulse-dark-1 {
		0%, 100% { opacity: 0.2; }
		50% { opacity: 0.4; }
	}

	@keyframes aurora-pulse-dark-2 {
		0%, 100% { opacity: 0.15; }
		50% { opacity: 0.35; }
	}

	@keyframes aurora-pulse-dark-3 {
		0%, 100% { opacity: 0.2; }
		50% { opacity: 0.45; }
	}

	@keyframes aurora-pulse-dark-4 {
		0%, 100% { opacity: 0.15; }
		50% { opacity: 0.35; }
	}

	@keyframes aurora-pulse-dark-5 {
		0%, 100% { opacity: 0.2; }
		50% { opacity: 0.4; }
	}

	@keyframes aurora-pulse-dark-6 {
		0%, 100% { opacity: 0.15; }
		50% { opacity: 0.35; }
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
