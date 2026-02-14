<script lang="ts">
	interface Props {
		height?: string;
		fade?: 'top' | 'bottom' | 'both';
	}

	let { height, fade }: Props = $props();
</script>

<div
	class="wave-container"
	style={height ? `position:absolute;height:${height}` : undefined}
>
	<div class="wave wave-1"></div>
	<div class="wave wave-2"></div>
	<div class="wave wave-3"></div>
	<div class="wave wave-4"></div>
	<div class="wave wave-5"></div>
	<div class="wave wave-6"></div>
	<div class="wave wave-7"></div>
	<div class="mask mask-1"></div>
	<div class="mask mask-2"></div>
	{#if fade === 'top' || fade === 'both'}
		<div class="fade fade-top"></div>
	{/if}
	{#if fade === 'bottom' || fade === 'both'}
		<div class="fade fade-bottom"></div>
	{/if}
</div>

<style>
	.wave-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}

	.wave {
		position: absolute;
		border-radius: 40% 60% 55% 45% / 55% 45% 60% 40%;
		filter: blur(60px);
		opacity: 0.55;
		mix-blend-mode: screen;
	}

	:global(.dark) .wave {
		opacity: 0.3;
		mix-blend-mode: plus-lighter;
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

	.wave-1 {
		width: 70vw;
		height: 35vw;
		max-width: 900px;
		max-height: 450px;
		top: -8%;
		left: -15%;
		background: radial-gradient(ellipse at 30% 50%, oklch(0.65 0.15 180 / 0.7) 0%, transparent 70%);
		animation: wave1-move 8s ease-in-out infinite;
	}

	.wave-2 {
		width: 60vw;
		height: 40vw;
		max-width: 780px;
		max-height: 520px;
		top: 10%;
		right: -20%;
		background: radial-gradient(ellipse at 70% 40%, oklch(0.48 0.18 270 / 0.7) 0%, transparent 70%);
		animation: wave2-move 10s ease-in-out infinite;
	}

	.wave-3 {
		width: 55vw;
		height: 45vw;
		max-width: 700px;
		max-height: 580px;
		top: 35%;
		left: 10%;
		background: radial-gradient(ellipse at 50% 60%, oklch(0.52 0.18 220 / 0.65) 0%, transparent 70%);
		animation: wave3-move 9s ease-in-out infinite;
	}

	.wave-4 {
		width: 65vw;
		height: 30vw;
		max-width: 840px;
		max-height: 390px;
		bottom: 5%;
		right: -5%;
		background: radial-gradient(ellipse at 60% 50%, oklch(0.65 0.15 180 / 0.65) 0%, transparent 70%);
		animation: wave4-move 11s ease-in-out infinite;
	}

	.wave-5 {
		width: 50vw;
		height: 50vw;
		max-width: 650px;
		max-height: 650px;
		top: 20%;
		left: -10%;
		background: radial-gradient(ellipse at 40% 40%, oklch(0.55 0.16 250 / 0.55) 0%, transparent 65%);
		animation: wave5-move 12s ease-in-out infinite;
	}

	.wave-6 {
		width: 60vw;
		height: 35vw;
		max-width: 780px;
		max-height: 450px;
		bottom: 15%;
		left: 20%;
		background: radial-gradient(ellipse at 50% 50%, oklch(0.6 0.16 195 / 0.6) 0%, transparent 70%);
		animation: wave6-move 9s ease-in-out infinite;
	}

	.wave-7 {
		width: 55vw;
		height: 40vw;
		max-width: 720px;
		max-height: 520px;
		top: 15%;
		right: 5%;
		background: radial-gradient(ellipse at 55% 45%, oklch(0.6 0.2 155 / 0.7) 0%, transparent 65%);
		animation: wave7-move 10s ease-in-out infinite;
	}

	.mask {
		position: absolute;
		border-radius: 45% 55% 50% 50% / 50% 50% 55% 45%;
		filter: blur(40px);
		opacity: 0.7;
	}

	.mask-1 {
		width: 35vw;
		height: 30vw;
		max-width: 450px;
		max-height: 390px;
		top: 25%;
		left: 30%;
		background: radial-gradient(ellipse at 50% 50%, var(--background) 0%, transparent 70%);
		animation: mask1-move 7s ease-in-out infinite;
	}

	.mask-2 {
		width: 30vw;
		height: 35vw;
		max-width: 390px;
		max-height: 450px;
		top: 40%;
		left: 45%;
		background: radial-gradient(ellipse at 50% 50%, var(--background) 0%, transparent 65%);
		animation: mask2-move 9s ease-in-out infinite;
	}

	@keyframes wave1-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		25% {
			transform: translate(14%, 11%) rotate(8deg) scale(1.07);
		}
		50% {
			transform: translate(7%, -7%) rotate(-5deg) scale(0.95);
		}
		75% {
			transform: translate(-11%, 9%) rotate(6deg) scale(1.04);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}

	@keyframes wave2-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		25% {
			transform: translate(-14%, 9%) rotate(-7deg) scale(1.05);
		}
		50% {
			transform: translate(9%, 14%) rotate(5deg) scale(0.94);
		}
		75% {
			transform: translate(11%, -11%) rotate(-8deg) scale(1.06);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}

	@keyframes wave3-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		25% {
			transform: translate(10%, -14%) rotate(9deg) scale(0.94);
		}
		50% {
			transform: translate(-9%, 7%) rotate(-6deg) scale(1.07);
		}
		75% {
			transform: translate(-14%, -10%) rotate(5deg) scale(0.97);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}

	@keyframes wave4-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		25% {
			transform: translate(-16%, -7%) rotate(-5deg) scale(1.06);
		}
		50% {
			transform: translate(6%, 11%) rotate(8deg) scale(0.94);
		}
		75% {
			transform: translate(12%, -9%) rotate(-9deg) scale(1.04);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}

	@keyframes wave5-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		25% {
			transform: translate(11%, 14%) rotate(-8deg) scale(1.05);
		}
		50% {
			transform: translate(-7%, -11%) rotate(6deg) scale(0.95);
		}
		75% {
			transform: translate(-12%, 7%) rotate(-5deg) scale(1.03);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}

	@keyframes wave6-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		25% {
			transform: translate(9%, -12%) rotate(7deg) scale(0.96);
		}
		50% {
			transform: translate(-11%, 9%) rotate(-8deg) scale(1.06);
		}
		75% {
			transform: translate(14%, 10%) rotate(5deg) scale(0.97);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}

	@keyframes wave7-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		25% {
			transform: translate(-12%, 10%) rotate(-6deg) scale(1.08);
		}
		50% {
			transform: translate(8%, -12%) rotate(7deg) scale(0.93);
		}
		75% {
			transform: translate(13%, 8%) rotate(-4deg) scale(1.05);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}

	@keyframes mask1-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		33% {
			transform: translate(8%, -10%) rotate(6deg) scale(1.05);
		}
		66% {
			transform: translate(-6%, 8%) rotate(-4deg) scale(0.96);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}

	@keyframes mask2-move {
		0% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
		33% {
			transform: translate(-10%, 6%) rotate(-5deg) scale(0.97);
		}
		66% {
			transform: translate(7%, -9%) rotate(7deg) scale(1.04);
		}
		100% {
			transform: translate(0%, 0%) rotate(0deg) scale(1);
		}
	}
</style>
