<script lang="ts">
	import PageIntro from '$lib/components/page-intro.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import TierBadge from '$lib/components/TierBadge.svelte';
	import { Copy, ArrowRight } from 'lucide-svelte';
	import AnimatedShow from '$lib/components/AnimatedShow.svelte';
	import type { AnimationType } from '$lib/components/AnimatedShow.svelte';

	// Transition demo states
	const transitions: AnimationType[] = ['slide', 'fade', 'fly', 'scale', 'slideX'];
	let transitionStates = $state<Record<AnimationType, boolean>>({
		slide: false,
		fade: false,
		fly: false,
		scale: false,
		slideX: false
	});

	function toggleTransition(type: AnimationType) {
		transitionStates[type] = !transitionStates[type];
	}
</script>

<svelte:head>
	<title>Playground - Component Demos</title>
</svelte:head>

<PageIntro title="Playground" description="Interactive component demos and examples" />

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Emerald Button Variants</Card.Title>
			<Card.Description>Interactive gradient buttons with mouse tracking</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-4">
				<EmeraldButton variant="default">Default Emerald Long Button Text</EmeraldButton>

				<EmeraldButton variant="darker">Darker Emerald Long Button Text</EmeraldButton>

				<EmeraldButton variant="light">Light Emerald Long Button Text</EmeraldButton>

				<EmeraldButton variant="lighter">Lighter Emerald Long Button Text</EmeraldButton>
			</div>
			<div class="mt-12">
				<EmeraldButton variant="lighter">
					<Copy class="size-4" />
					Copy all backup codes
				</EmeraldButton>
			</div>
			<div class="mt-12 space-y-6">
				<div class="space-y-2">
					<h3 class="text-sm font-semibold">With Tracking</h3>
					<div class="flex flex-wrap gap-3">
						<!-- All button variants with tracking -->
						<Button tracking>
							Default
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="destructive" tracking>
							Destructive
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="outline" tracking>
							Outline
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="secondary" tracking>
							Secondary
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="ghost" tracking>
							Ghost
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="link" tracking>
							Link
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="primary_outline" tracking>
							Primary Outline
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="fancy" tracking>
							Fancy
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="glass" tracking>
							Glass Button
							<ArrowRight class="size-4" />
						</Button>
						<Button variant="glass2" tracking>
							Glass2 Button
							<ArrowRight class="size-4" />
						</Button>
					</div>

					<div class="flex flex-wrap gap-3">
						<!-- Different sizes -->
						<Button size="sm" tracking>Small</Button>
						<Button size="default" tracking>Default Size</Button>
						<Button size="lg" tracking>Large</Button>
					</div>

					<div class="flex flex-wrap gap-3">
						<!-- Link button (anchor tag) -->
						<Button href="/profile" tracking>Link Button (anchor)</Button>
					</div>
				</div>

				<div class="space-y-2">
					<h3 class="text-sm font-semibold">Without Tracking</h3>
					<div class="flex flex-wrap gap-3">
						<!-- All button variants without tracking -->
						<Button>Default</Button>
						<Button variant="destructive">Destructive</Button>
						<Button variant="outline">Outline</Button>
						<Button variant="secondary">Secondary</Button>
						<Button variant="ghost">Ghost</Button>
						<Button variant="link">Link</Button>
						<Button variant="primary_outline">Primary Outline</Button>
						<Button variant="fancy">Fancy</Button>
						<Button variant="glass">
							Glass Button
							<ArrowRight class="w-4 h-4 ml-2" />
						</Button>
						<Button variant="glass2">
							Glass2 Button
							<ArrowRight class="w-4 h-4 ml-2" />
						</Button>
					</div>

					<div class="flex flex-wrap gap-3">
						<!-- Different sizes -->
						<Button size="sm">Small</Button>
						<Button size="default">Default Size</Button>
						<Button size="lg">Large</Button>
					</div>

					<div class="flex flex-wrap gap-3">
						<!-- Link button (anchor tag) -->
						<Button href="/profile">Link Button (anchor)</Button>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Tier Badge Variants</Card.Title>
			<Card.Description>Subscription tier badges with gradient styling</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-4">
				<TierBadge tier="free" />
				<TierBadge tier="pro" />
				<TierBadge tier="business" />
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>AnimatedShow Component Demos</Card.Title>
			<Card.Description>
				Click a button to toggle the transition. First click animates in, second click animates out.
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-6">
			{#each transitions as type}
				<div>
					<div class="flex items-center gap-3 mb-3">
						<Button
							variant="outline"
							onclick={() => toggleTransition(type)}
						>
							{type === 'slideX' ? 'Slide Horizontal' : type.charAt(0).toUpperCase() + type.slice(1)} Transition
							{transitionStates[type] ? '(Hide)' : '(Show)'}
						</Button>
						<span class="text-sm text-muted-foreground">
							{type === 'slide' && 'Collapses height vertically'}
							{type === 'fade' && 'Fades opacity + height collapse'}
							{type === 'fly' && 'Slides from top + height collapse'}
							{type === 'scale' && 'Scales down + height collapse'}
							{type === 'slideX' && 'Slides from left, exits right + height collapse'}
						</span>
					</div>

					<AnimatedShow when={transitionStates[type]} animation={type} duration={250}>
						{#snippet children()}
							<div class="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:from-blue-950/20 dark:to-indigo-950/20">
								<h4 class="font-semibold text-blue-900 dark:text-blue-100">
									{type === 'slideX' ? 'Slide Horizontal' : type.charAt(0).toUpperCase() + type.slice(1)} Animation Demo
								</h4>
								<p class="mt-2 text-sm text-blue-700 dark:text-blue-300">
									This element animates in with <strong>{type}</strong> transition.
									Click the button again to see the smooth exit animation with height collapse!
								</p>
							</div>
						{/snippet}
					</AnimatedShow>
				</div>
			{/each}

			<div class="mt-8 rounded-lg border bg-muted/50 p-4">
				<h4 class="font-semibold mb-2">Advanced Usage</h4>
				<p class="text-sm text-muted-foreground mb-3">
					You can combine different in/out animations for more sophisticated effects:
				</p>
				<div class="space-y-3">
					<div class="flex items-center gap-3">
						<Button
							variant="secondary"
							onclick={() => transitionStates.fade = !transitionStates.fade}
						>
							Fly In + Scale Out
						</Button>
					</div>
					<AnimatedShow
						when={transitionStates.fade}
						inAnimation="fly"
						outAnimation="scale"
						outDuration={250}
					>
						{#snippet children()}
							<div class="rounded-lg border bg-gradient-to-r from-emerald-50 to-teal-50 p-6 dark:from-emerald-950/20 dark:to-teal-950/20">
								<h4 class="font-semibold text-emerald-900 dark:text-emerald-100">
									Combined Animation
								</h4>
								<p class="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
									Flies in from top, scales down on exit. Perfect for notifications!
								</p>
							</div>
						{/snippet}
					</AnimatedShow>
				</div>
			</div>

			<div class="rounded-lg border bg-blue-50/50 p-4 dark:bg-blue-950/20">
				<h4 class="font-semibold text-sm mb-2">✨ No More Jarring Snaps!</h4>
				<p class="text-sm text-muted-foreground">
					All exit animations automatically include height collapse, so elements shrink smoothly without
					the abrupt "snap closed" effect. The component also respects <code class="rounded bg-muted px-1 py-0.5">prefers-reduced-motion</code>
					for accessibility.
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
