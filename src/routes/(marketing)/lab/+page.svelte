<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import AnimatedBg from '$lib/components/animated-bg.svelte';
	import AnimatedWaveBg from '$lib/components/animated-wave-bg.svelte';
	import AnimatedFirefliesBg from '$lib/components/animated-fireflies-bg.svelte';
	import AnimatedAuroraBg from '$lib/components/animated-aurora-bg.svelte';
	import AnimatedAuroraSubtleBg from '$lib/components/animated-aurora-subtle-bg.svelte';
</script>

<svelte:head>
	<title>Lab - FormTrap</title>
</svelte:head>

<div class="container mx-auto px-4 py-16 space-y-16">
	<h1 class="text-4xl font-bold tracking-tight">Lab</h1>

	<!-- Standard Buttons -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold">Standard Buttons</h2>
		<div class="flex flex-wrap gap-4 items-center">
			<Button>Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="primary_outline">Primary Outline</Button>
			<Button variant="link">Link</Button>
			<Button variant="fancy">Fancy</Button>
			<Button variant="glass">Glass</Button>
			<Button variant="glass2">Glass 2</Button>
			<Button variant="original">Original</Button>
		</div>
		<h3 class="text-lg font-medium text-muted-foreground pt-2">Sizes</h3>
		<div class="flex flex-wrap gap-4 items-center">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon">+</Button>
		</div>
	</section>

	<!-- Standard Buttons with Tracking -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold">Standard Buttons (with tracking)</h2>
		<div class="flex flex-wrap gap-4 items-center">
			<Button tracking>Default</Button>
			<Button tracking variant="secondary">Secondary</Button>
			<Button tracking variant="destructive">Destructive</Button>
			<Button tracking variant="outline">Outline</Button>
			<Button tracking variant="ghost">Ghost</Button>
			<Button tracking variant="primary_outline">Primary Outline</Button>
			<Button tracking variant="fancy">Fancy</Button>
			<Button tracking variant="glass">Glass</Button>
			<Button tracking variant="glass2">Glass 2</Button>
			<Button tracking variant="original">Original</Button>
		</div>
	</section>

	<!-- Emerald Buttons -->
	<section class="space-y-4">
		<h2 class="text-2xl font-semibold">Emerald Buttons</h2>
		<div class="flex flex-wrap gap-4 items-center">
			<EmeraldButton variant="lighter">Lighter</EmeraldButton>
			<EmeraldButton variant="light">Light</EmeraldButton>
			<EmeraldButton variant="default">Default</EmeraldButton>
			<EmeraldButton variant="darker">Darker</EmeraldButton>
		</div>
	</section>

	<!-- Animated Backgrounds -->
	<section class="space-y-8">
		<h2 class="text-2xl font-semibold">Animated Backgrounds</h2>

		<div class="space-y-4">
			<h3 class="text-lg font-medium text-muted-foreground">AnimatedBg (morphing blobs)</h3>
			<div class="relative rounded-lg border overflow-hidden h-[300px]">
				<AnimatedBg height="300px" fade="bottom" />
				<div class="absolute inset-0 flex items-center justify-center z-10">
					<span class="text-sm font-mono text-muted-foreground bg-background/60 px-3 py-1 rounded">AnimatedBg</span>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<h3 class="text-lg font-medium text-muted-foreground">AnimatedWaveBg (waves)</h3>
			<div class="relative rounded-lg border overflow-hidden h-[300px]">
				<AnimatedWaveBg height="300px" fade="bottom" />
				<div class="absolute inset-0 flex items-center justify-center z-10">
					<span class="text-sm font-mono text-muted-foreground bg-background/60 px-3 py-1 rounded">AnimatedWaveBg</span>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<h3 class="text-lg font-medium text-muted-foreground">AnimatedFirefliesBg (fireflies)</h3>
			<div class="relative rounded-lg border overflow-hidden h-[300px]">
				<AnimatedFirefliesBg height="300px" fade="bottom" />
				<div class="absolute inset-0 flex items-center justify-center z-10">
					<span class="text-sm font-mono text-muted-foreground bg-background/60 px-3 py-1 rounded">AnimatedFirefliesBg</span>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<h3 class="text-lg font-medium text-muted-foreground">AnimatedAuroraBg (aurora)</h3>
			<div class="relative rounded-lg border overflow-hidden h-[300px]">
				<AnimatedAuroraBg height="300px" fade="bottom" />
				<div class="absolute inset-0 flex items-center justify-center z-10">
					<span class="text-sm font-mono text-muted-foreground bg-background/60 px-3 py-1 rounded">AnimatedAuroraBg</span>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			<h3 class="text-lg font-medium text-muted-foreground">AnimatedAuroraSubtleBg (aurora subtle)</h3>
			<div class="relative rounded-lg border overflow-hidden h-[300px]">
				<AnimatedAuroraSubtleBg height="300px" fade="bottom" />
				<div class="absolute inset-0 flex items-center justify-center z-10">
					<span class="text-sm font-mono text-muted-foreground bg-background/60 px-3 py-1 rounded">AnimatedAuroraSubtleBg</span>
				</div>
			</div>
		</div>
	</section>
</div>
