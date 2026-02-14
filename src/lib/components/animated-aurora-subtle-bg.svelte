<script lang="ts">
	interface Props {
		height?: string;
		fade?: 'top' | 'bottom' | 'both';
	}

	let { height, fade }: Props = $props();
</script>

<div
	class="aurora-s-container"
	style={height ? `position:absolute;height:${height}` : undefined}
>
	<div class="aurora-s-ray ray-s-1"></div>
	<div class="aurora-s-ray ray-s-gap gap-s-1"></div>
	<div class="aurora-s-ray ray-s-2"></div>
	<div class="aurora-s-ray ray-s-gap gap-s-2"></div>
	<div class="aurora-s-ray ray-s-3"></div>
	<div class="aurora-s-ray ray-s-gap gap-s-3"></div>
	<div class="aurora-s-ray ray-s-4"></div>
	<div class="aurora-s-ray ray-s-gap gap-s-4"></div>
	<div class="aurora-s-ray ray-s-5"></div>
	<div class="aurora-s-ray ray-s-gap gap-s-5"></div>
	<div class="aurora-s-ray ray-s-6"></div>
	{#if fade === 'top' || fade === 'both'}
		<div class="fade fade-top"></div>
	{/if}
	{#if fade === 'bottom' || fade === 'both'}
		<div class="fade fade-bottom"></div>
	{/if}
</div>

<style>
	.aurora-s-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}

	.aurora-s-ray {
		position: absolute;
		top: -50%;
		width: 25vw;
		height: 200%;
		opacity: 0.2;
		filter: blur(70px);
		will-change: transform, opacity;
		transform-origin: center center;
	}

	:global(.dark) .aurora-s-ray {
		opacity: 0.12;
	}

	.ray-s-1 {
		left: -5%;
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.4) h / 0.35) 20%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.2) calc(h + 20) / 0.25) 40%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.3) h / 0.4) 60%,
			transparent 80%
		);
		animation: aurora-s-sway-1 8s ease-in-out infinite, aurora-s-pulse-1 6s ease-in-out infinite;
	}

	.ray-s-2 {
		left: 15%;
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.1) calc(h - 15) / 0.3) 25%,
			oklch(from var(--primary) calc(l + 0.3) calc(c * 1.3) calc(h + 10) / 0.35) 50%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.2) h / 0.25) 70%,
			transparent 90%
		);
		animation: aurora-s-sway-2 10s ease-in-out infinite, aurora-s-pulse-2 7s ease-in-out infinite;
	}

	.ray-s-3 {
		left: 35%;
		background: linear-gradient(
			180deg,
			transparent 5%,
			oklch(from var(--primary) calc(l + 0.05) calc(c * 1.5) calc(h + 25) / 0.4) 30%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.2) h / 0.3) 55%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.4) calc(h - 10) / 0.35) 75%,
			transparent 95%
		);
		animation: aurora-s-sway-3 9s ease-in-out infinite, aurora-s-pulse-3 5s ease-in-out infinite;
	}

	.ray-s-4 {
		left: 55%;
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.3) calc(h + 30) / 0.3) 20%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.5) h / 0.4) 45%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.1) calc(h - 20) / 0.25) 70%,
			transparent 85%
		);
		animation: aurora-s-sway-4 11s ease-in-out infinite, aurora-s-pulse-4 8s ease-in-out infinite;
	}

	.ray-s-5 {
		left: 72%;
		background: linear-gradient(
			180deg,
			transparent 10%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.2) calc(h + 15) / 0.35) 30%,
			oklch(from var(--primary) calc(l + 0.3) calc(c * 1.4) h / 0.3) 55%,
			oklch(from var(--primary) calc(l + 0.05) calc(c * 1.3) calc(h - 25) / 0.4) 80%,
			transparent 95%
		);
		animation: aurora-s-sway-5 7s ease-in-out infinite, aurora-s-pulse-5 9s ease-in-out infinite;
	}

	.ray-s-6 {
		left: 88%;
		background: linear-gradient(
			180deg,
			transparent 5%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.5) calc(h + 10) / 0.25) 25%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.1) calc(h - 30) / 0.35) 50%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.3) h / 0.3) 75%,
			transparent 90%
		);
		animation: aurora-s-sway-6 12s ease-in-out infinite, aurora-s-pulse-6 6s ease-in-out infinite;
	}

	/* Dark mode: override gradients with lower alpha stops */
	:global(.dark) .ray-s-1 {
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.4) h / 0.3) 20%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.2) calc(h + 20) / 0.2) 40%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.3) h / 0.35) 60%,
			transparent 80%
		);
		animation: aurora-s-sway-1 8s ease-in-out infinite, aurora-s-pulse-dark-1 6s ease-in-out infinite;
	}

	:global(.dark) .ray-s-2 {
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.1) calc(h - 15) / 0.25) 25%,
			oklch(from var(--primary) calc(l + 0.3) calc(c * 1.3) calc(h + 10) / 0.3) 50%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.2) h / 0.2) 70%,
			transparent 90%
		);
		animation: aurora-s-sway-2 10s ease-in-out infinite, aurora-s-pulse-dark-2 7s ease-in-out infinite;
	}

	:global(.dark) .ray-s-3 {
		background: linear-gradient(
			180deg,
			transparent 5%,
			oklch(from var(--primary) calc(l + 0.05) calc(c * 1.5) calc(h + 25) / 0.35) 30%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.2) h / 0.25) 55%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.4) calc(h - 10) / 0.3) 75%,
			transparent 95%
		);
		animation: aurora-s-sway-3 9s ease-in-out infinite, aurora-s-pulse-dark-3 5s ease-in-out infinite;
	}

	:global(.dark) .ray-s-4 {
		background: linear-gradient(
			180deg,
			transparent 0%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.3) calc(h + 30) / 0.25) 20%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.5) h / 0.35) 45%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.1) calc(h - 20) / 0.2) 70%,
			transparent 85%
		);
		animation: aurora-s-sway-4 11s ease-in-out infinite, aurora-s-pulse-dark-4 8s ease-in-out infinite;
	}

	:global(.dark) .ray-s-5 {
		background: linear-gradient(
			180deg,
			transparent 10%,
			oklch(from var(--primary) calc(l + 0.15) calc(c * 1.2) calc(h + 15) / 0.3) 30%,
			oklch(from var(--primary) calc(l + 0.3) calc(c * 1.4) h / 0.25) 55%,
			oklch(from var(--primary) calc(l + 0.05) calc(c * 1.3) calc(h - 25) / 0.35) 80%,
			transparent 95%
		);
		animation: aurora-s-sway-5 7s ease-in-out infinite, aurora-s-pulse-dark-5 9s ease-in-out infinite;
	}

	:global(.dark) .ray-s-6 {
		background: linear-gradient(
			180deg,
			transparent 5%,
			oklch(from var(--primary) calc(l + 0.2) calc(c * 1.5) calc(h + 10) / 0.2) 25%,
			oklch(from var(--primary) calc(l + 0.1) calc(c * 1.1) calc(h - 30) / 0.3) 50%,
			oklch(from var(--primary) calc(l + 0.25) calc(c * 1.3) h / 0.25) 75%,
			transparent 90%
		);
		animation: aurora-s-sway-6 12s ease-in-out infinite, aurora-s-pulse-dark-6 6s ease-in-out infinite;
	}

	/* Background-colored gap rays */
	.ray-s-gap {
		background: linear-gradient(
			180deg,
			transparent 0%,
			var(--background) 15%,
			var(--background) 50%,
			var(--background) 85%,
			transparent 100%
		);
		opacity: 0.8;
		width: 30vw;
		filter: blur(80px);
	}

	:global(.dark) .ray-s-gap {
		opacity: 0.85;
		width: 32vw;
		filter: blur(90px);
	}

	.gap-s-1 {
		left: -5%;
		width: 35vw;
		animation: aurora-s-sway-gap-1 14s ease-in-out infinite;
	}

	.gap-s-2 {
		left: 22%;
		animation: aurora-s-sway-gap-2 16s ease-in-out infinite;
	}

	.gap-s-3 {
		left: 40%;
		animation: aurora-s-sway-gap-3 13s ease-in-out infinite;
	}

	.gap-s-4 {
		left: 60%;
		animation: aurora-s-sway-gap-4 15s ease-in-out infinite;
	}

	.gap-s-5 {
		left: 78%;
		animation: aurora-s-sway-gap-5 12s ease-in-out infinite;
	}

	@keyframes aurora-s-sway-gap-1 {
		0%, 100% { transform: translateX(0) rotate(3deg) skewX(2deg); }
		25% { transform: translateX(10vw) rotate(-4deg) skewX(-3deg); }
		50% { transform: translateX(-5vw) rotate(5deg) skewX(4deg); }
		75% { transform: translateX(15vw) rotate(-3deg) skewX(-2deg); }
	}

	@keyframes aurora-s-sway-gap-2 {
		0%, 100% { transform: translateX(0) rotate(-4deg) skewX(-3deg); }
		25% { transform: translateX(-12vw) rotate(5deg) skewX(4deg); }
		50% { transform: translateX(8vw) rotate(-6deg) skewX(-5deg); }
		75% { transform: translateX(-8vw) rotate(3deg) skewX(2deg); }
	}

	@keyframes aurora-s-sway-gap-3 {
		0%, 100% { transform: translateX(0) rotate(5deg) skewX(3deg); }
		25% { transform: translateX(-15vw) rotate(-3deg) skewX(-4deg); }
		50% { transform: translateX(-5vw) rotate(6deg) skewX(5deg); }
		75% { transform: translateX(-20vw) rotate(-5deg) skewX(-3deg); }
	}

	@keyframes aurora-s-sway-gap-4 {
		0%, 100% { transform: translateX(0) rotate(-3deg) skewX(-2deg); }
		25% { transform: translateX(8vw) rotate(4deg) skewX(3deg); }
		50% { transform: translateX(-10vw) rotate(-5deg) skewX(-4deg); }
		75% { transform: translateX(12vw) rotate(3deg) skewX(2deg); }
	}

	@keyframes aurora-s-sway-gap-5 {
		0%, 100% { transform: translateX(0) rotate(4deg) skewX(3deg); }
		25% { transform: translateX(-10vw) rotate(-5deg) skewX(-4deg); }
		50% { transform: translateX(6vw) rotate(4deg) skewX(3deg); }
		75% { transform: translateX(-14vw) rotate(-3deg) skewX(-2deg); }
	}

	/* Sway keyframes */
	@keyframes aurora-s-sway-1 {
		0% { transform: translateX(0) rotate(-8deg) skewX(-5deg); }
		10% { transform: translateX(18vw) rotate(5deg) skewX(3deg); }
		40% { transform: translateX(25vw) rotate(-3deg) skewX(-8deg); }
		70% { transform: translateX(12vw) rotate(8deg) skewX(5deg); }
		100% { transform: translateX(0) rotate(-8deg) skewX(-5deg); }
	}

	@keyframes aurora-s-sway-2 {
		0%, 100% { transform: translateX(0) rotate(5deg) skewX(4deg); }
		25% { transform: translateX(-10vw) rotate(-8deg) skewX(-6deg); }
		50% { transform: translateX(12vw) rotate(10deg) skewX(8deg); }
		75% { transform: translateX(-5vw) rotate(-4deg) skewX(-3deg); }
	}

	@keyframes aurora-s-sway-3 {
		0%, 100% { transform: translateX(0) rotate(-3deg) skewX(-4deg); }
		25% { transform: translateX(18vw) rotate(8deg) skewX(6deg); }
		50% { transform: translateX(-8vw) rotate(-10deg) skewX(-8deg); }
		75% { transform: translateX(10vw) rotate(5deg) skewX(4deg); }
	}

	@keyframes aurora-s-sway-4 {
		0%, 100% { transform: translateX(0) rotate(6deg) skewX(5deg); }
		25% { transform: translateX(-15vw) rotate(-5deg) skewX(-7deg); }
		50% { transform: translateX(-20vw) rotate(8deg) skewX(6deg); }
		75% { transform: translateX(-8vw) rotate(-8deg) skewX(-4deg); }
	}

	@keyframes aurora-s-sway-5 {
		0%, 100% { transform: translateX(0) rotate(-5deg) skewX(-3deg); }
		25% { transform: translateX(-12vw) rotate(6deg) skewX(5deg); }
		50% { transform: translateX(5vw) rotate(-8deg) skewX(-6deg); }
		75% { transform: translateX(-18vw) rotate(10deg) skewX(8deg); }
	}

	@keyframes aurora-s-sway-6 {
		0%, 100% { transform: translateX(0) rotate(4deg) skewX(3deg); }
		25% { transform: translateX(-20vw) rotate(-7deg) skewX(-5deg); }
		50% { transform: translateX(-10vw) rotate(5deg) skewX(7deg); }
		75% { transform: translateX(-25vw) rotate(-6deg) skewX(-4deg); }
	}

	/* Light mode pulse */
	@keyframes aurora-s-pulse-1 {
		0%, 100% { opacity: 0.08; }
		15% { opacity: 0.25; }
		35% { opacity: 0.08; }
		70% { opacity: 0.2; }
		85% { opacity: 0.08; }
	}

	@keyframes aurora-s-pulse-2 {
		0%, 100% { opacity: 0.12; }
		50% { opacity: 0.28; }
	}

	@keyframes aurora-s-pulse-3 {
		0%, 100% { opacity: 0.18; }
		50% { opacity: 0.32; }
	}

	@keyframes aurora-s-pulse-4 {
		0%, 100% { opacity: 0.12; }
		50% { opacity: 0.25; }
	}

	@keyframes aurora-s-pulse-5 {
		0%, 100% { opacity: 0.15; }
		50% { opacity: 0.3; }
	}

	@keyframes aurora-s-pulse-6 {
		0%, 100% { opacity: 0.12; }
		50% { opacity: 0.25; }
	}

	/* Dark mode pulse - much dimmer */
	@keyframes aurora-s-pulse-dark-1 {
		0%, 100% { opacity: 0.08; }
		50% { opacity: 0.2; }
	}

	@keyframes aurora-s-pulse-dark-2 {
		0%, 100% { opacity: 0.06; }
		50% { opacity: 0.18; }
	}

	@keyframes aurora-s-pulse-dark-3 {
		0%, 100% { opacity: 0.1; }
		50% { opacity: 0.22; }
	}

	@keyframes aurora-s-pulse-dark-4 {
		0%, 100% { opacity: 0.06; }
		50% { opacity: 0.16; }
	}

	@keyframes aurora-s-pulse-dark-5 {
		0%, 100% { opacity: 0.08; }
		50% { opacity: 0.2; }
	}

	@keyframes aurora-s-pulse-dark-6 {
		0%, 100% { opacity: 0.06; }
		50% { opacity: 0.18; }
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
