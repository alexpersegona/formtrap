<script lang="ts">
	interface Props {
		height?: string;
		fade?: 'top' | 'bottom' | 'both';
	}

	let { height, fade }: Props = $props();
</script>

<div
	class="blob-morph-container"
	style={height ? `position:absolute;height:${height}` : undefined}
>
	<div class="blob-blur"><div class="blob-morph blob-morph-1"></div></div>
	<div class="blob-blur"><div class="blob-morph blob-morph-2"></div></div>
	<div class="blob-blur"><div class="blob-morph blob-morph-3"></div></div>
	<div class="blob-blur"><div class="blob-morph blob-morph-4"></div></div>
	<div class="blob-blur blob-hole"><div class="blob-morph blob-morph-5"></div></div>
	{#if fade === 'top' || fade === 'both'}
		<div class="fade fade-top"></div>
	{/if}
	{#if fade === 'bottom' || fade === 'both'}
		<div class="fade fade-bottom"></div>
	{/if}
</div>

<style>
	.blob-morph-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}

	.blob-blur {
		position: absolute;
		width: 60vw;
		height: 60vw;
		max-width: 700px;
		max-height: 700px;
		filter: blur(100px);
		opacity: 0.6;
		will-change: transform;
	}

	:global(.dark) .blob-blur {
		opacity: 0.3;
	}

	.blob-blur:nth-child(1) {
		top: -10%;
		left: -5%;
		animation: drift-1 20s ease-in-out infinite;
	}

	.blob-blur:nth-child(2) {
		top: 20%;
		right: -10%;
		animation: drift-2 24s ease-in-out infinite;
	}

	.blob-blur:nth-child(3) {
		bottom: -5%;
		left: 15%;
		animation: drift-3 22s ease-in-out infinite;
	}

	.blob-blur:nth-child(4) {
		top: 30%;
		left: 30%;
		width: 50vw;
		height: 50vw;
		max-width: 600px;
		max-height: 600px;
		animation: drift-4 26s ease-in-out infinite;
	}

	.blob-hole {
		top: 10%;
		left: 20%;
		width: 45vw;
		height: 45vw;
		max-width: 550px;
		max-height: 550px;
		opacity: 0.8;
		animation: drift-5 18s ease-in-out infinite;
	}

	:global(.dark) .blob-hole {
		opacity: 0.7;
	}

	.blob-morph {
		width: 100%;
		height: 100%;
		will-change: clip-path;
	}

	.blob-morph-1 {
		background: oklch(from var(--primary) calc(l + 0.1) calc(c * 1.3) h);
		animation: morph-1 8s ease-in-out infinite;
	}

	.blob-morph-2 {
		background: oklch(from var(--primary) calc(l + 0.05) calc(c * 1.1) calc(h + 30));
		animation: morph-2 10s ease-in-out infinite;
	}

	.blob-morph-3 {
		background: oklch(from var(--primary) calc(l + 0.15) calc(c * 1.2) calc(h - 20));
		animation: morph-3 9s ease-in-out infinite;
	}

	.blob-morph-4 {
		background: oklch(from var(--primary) calc(l + 0.2) calc(c * 0.9) calc(h + 15));
		animation: morph-4 12s ease-in-out infinite;
	}

	.blob-morph-5 {
		background: var(--background);
		animation: morph-5 11s ease-in-out infinite;
	}

	@keyframes morph-1 {
		0% {
			clip-path: polygon(
				45% 2%, 80% 5%, 95% 30%, 90% 60%,
				75% 85%, 50% 98%, 20% 88%, 5% 62%,
				2% 35%, 15% 12%, 35% 3%, 55% 8%
			);
		}
		25% {
			clip-path: polygon(
				20% 10%, 55% 2%, 90% 18%, 98% 50%,
				85% 80%, 60% 95%, 30% 92%, 8% 75%,
				3% 45%, 10% 20%, 30% 5%, 50% 15%
			);
		}
		50% {
			clip-path: polygon(
				35% 5%, 75% 12%, 92% 40%, 88% 70%,
				70% 92%, 40% 98%, 12% 82%, 3% 52%,
				8% 22%, 25% 5%, 55% 2%, 70% 8%
			);
		}
		75% {
			clip-path: polygon(
				50% 3%, 85% 8%, 97% 35%, 92% 65%,
				78% 90%, 45% 95%, 15% 85%, 2% 55%,
				5% 25%, 20% 8%, 42% 2%, 65% 5%
			);
		}
		100% {
			clip-path: polygon(
				45% 2%, 80% 5%, 95% 30%, 90% 60%,
				75% 85%, 50% 98%, 20% 88%, 5% 62%,
				2% 35%, 15% 12%, 35% 3%, 55% 8%
			);
		}
	}

	@keyframes morph-2 {
		0% {
			clip-path: polygon(
				30% 5%, 65% 2%, 92% 20%, 98% 55%,
				85% 82%, 55% 95%, 25% 90%, 5% 68%,
				2% 38%, 12% 15%, 35% 5%, 50% 10%
			);
		}
		33% {
			clip-path: polygon(
				55% 2%, 88% 12%, 95% 45%, 85% 78%,
				60% 95%, 28% 92%, 8% 72%, 3% 42%,
				12% 15%, 38% 3%, 62% 5%, 80% 8%
			);
		}
		66% {
			clip-path: polygon(
				18% 8%, 50% 3%, 82% 15%, 95% 48%,
				90% 78%, 65% 95%, 32% 98%, 10% 80%,
				2% 50%, 5% 22%, 22% 5%, 42% 2%
			);
		}
		100% {
			clip-path: polygon(
				30% 5%, 65% 2%, 92% 20%, 98% 55%,
				85% 82%, 55% 95%, 25% 90%, 5% 68%,
				2% 38%, 12% 15%, 35% 5%, 50% 10%
			);
		}
	}

	@keyframes morph-3 {
		0% {
			clip-path: polygon(
				40% 3%, 78% 8%, 95% 35%, 92% 68%,
				75% 90%, 42% 97%, 12% 80%, 3% 50%,
				8% 22%, 28% 5%, 52% 2%, 72% 5%
			);
		}
		33% {
			clip-path: polygon(
				22% 5%, 58% 2%, 88% 22%, 97% 55%,
				88% 85%, 58% 97%, 22% 88%, 5% 60%,
				2% 30%, 15% 8%, 40% 3%, 65% 8%
			);
		}
		66% {
			clip-path: polygon(
				55% 2%, 85% 15%, 95% 48%, 88% 80%,
				65% 95%, 32% 92%, 8% 72%, 2% 40%,
				10% 12%, 35% 3%, 60% 5%, 80% 10%
			);
		}
		100% {
			clip-path: polygon(
				40% 3%, 78% 8%, 95% 35%, 92% 68%,
				75% 90%, 42% 97%, 12% 80%, 3% 50%,
				8% 22%, 28% 5%, 52% 2%, 72% 5%
			);
		}
	}

	@keyframes morph-4 {
		0% {
			clip-path: polygon(
				25% 8%, 60% 3%, 90% 22%, 97% 52%,
				88% 82%, 58% 95%, 22% 88%, 5% 58%,
				2% 28%, 18% 8%, 42% 3%, 68% 10%
			);
		}
		25% {
			clip-path: polygon(
				50% 2%, 82% 10%, 95% 42%, 90% 75%,
				68% 95%, 35% 97%, 8% 78%, 2% 45%,
				10% 15%, 35% 3%, 58% 5%, 78% 8%
			);
		}
		50% {
			clip-path: polygon(
				18% 5%, 52% 2%, 85% 18%, 98% 50%,
				90% 82%, 62% 97%, 28% 92%, 5% 68%,
				3% 35%, 15% 10%, 38% 2%, 62% 8%
			);
		}
		75% {
			clip-path: polygon(
				42% 3%, 78% 5%, 97% 32%, 92% 65%,
				75% 90%, 45% 98%, 15% 82%, 2% 52%,
				5% 20%, 25% 5%, 52% 2%, 72% 8%
			);
		}
		100% {
			clip-path: polygon(
				25% 8%, 60% 3%, 90% 22%, 97% 52%,
				88% 82%, 58% 95%, 22% 88%, 5% 58%,
				2% 28%, 18% 8%, 42% 3%, 68% 10%
			);
		}
	}

	@keyframes morph-5 {
		0% {
			clip-path: polygon(
				35% 5%, 70% 8%, 92% 25%, 95% 55%,
				80% 85%, 50% 95%, 18% 82%, 5% 55%,
				3% 28%, 15% 8%, 40% 3%, 62% 6%
			);
		}
		33% {
			clip-path: polygon(
				48% 3%, 82% 12%, 95% 42%, 88% 72%,
				65% 92%, 35% 95%, 10% 75%, 2% 45%,
				8% 18%, 30% 5%, 55% 2%, 75% 8%
			);
		}
		66% {
			clip-path: polygon(
				25% 8%, 58% 3%, 88% 18%, 95% 50%,
				85% 80%, 55% 95%, 22% 88%, 5% 62%,
				2% 32%, 12% 10%, 38% 5%, 60% 3%
			);
		}
		100% {
			clip-path: polygon(
				35% 5%, 70% 8%, 92% 25%, 95% 55%,
				80% 85%, 50% 95%, 18% 82%, 5% 55%,
				3% 28%, 15% 8%, 40% 3%, 62% 6%
			);
		}
	}

	@keyframes drift-1 {
		0% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(25vw, 15vh);
		}
		50% {
			transform: translate(10vw, 35vh);
		}
		75% {
			transform: translate(-10vw, 20vh);
		}
		100% {
			transform: translate(0, 0);
		}
	}

	@keyframes drift-2 {
		0% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(-30vw, 10vh);
		}
		50% {
			transform: translate(-15vw, -20vh);
		}
		75% {
			transform: translate(-25vw, 25vh);
		}
		100% {
			transform: translate(0, 0);
		}
	}

	@keyframes drift-3 {
		0% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(20vw, -25vh);
		}
		50% {
			transform: translate(35vw, -10vh);
		}
		75% {
			transform: translate(10vw, -30vh);
		}
		100% {
			transform: translate(0, 0);
		}
	}

	@keyframes drift-4 {
		0% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(-20vw, -15vh);
		}
		50% {
			transform: translate(15vw, -25vh);
		}
		75% {
			transform: translate(25vw, 10vh);
		}
		100% {
			transform: translate(0, 0);
		}
	}

	@keyframes drift-5 {
		0% {
			transform: translate(0, 0);
		}
		25% {
			transform: translate(15vw, 20vh);
		}
		50% {
			transform: translate(-10vw, 10vh);
		}
		75% {
			transform: translate(20vw, -15vh);
		}
		100% {
			transform: translate(0, 0);
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
