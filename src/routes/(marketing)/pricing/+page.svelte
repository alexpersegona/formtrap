<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Check, X, Crown, Zap, Building2 } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Tier data
	const tiers = [
		{
			name: 'Free',
			icon: Zap,
			price: { monthly: 0, annual: 0 },
			description: 'Perfect for trying out the platform',
			features: [
				{ name: '1 Space', included: true },
				{ name: '3 Forms per space', included: true },
				{ name: '5 Users per space', included: true },
				{ name: '100 Submissions/month', included: true },
				{ name: '100MB Storage', included: true },
				{ name: '30 days retention', included: true },
				{ name: 'Email notifications', included: true },
				{ name: 'Basic spam protection', included: true },
				{ name: 'CSV/JSON export', included: true },
				{ name: 'Webhooks', included: false },
				{ name: 'API access', included: false },
				{ name: 'Custom email templates', included: false },
				{ name: 'Bulk operations', included: false }
			],
			cta: 'Get Started',
			ctaVariant: 'outline' as const,
			popular: false
		},
		{
			name: 'Pro',
			icon: Crown,
			price: data.pricing.pro,
			description: 'For growing teams and projects',
			features: [
				{ name: '25 Spaces', included: true },
				{ name: 'Unlimited Forms', included: true },
				{ name: '50 Users per space', included: true },
				{ name: '5,000 Submissions/month', included: true },
				{ name: '10GB Storage', included: true },
				{ name: 'Up to 1 year retention', included: true },
				{ name: 'Email notifications', included: true },
				{ name: 'Advanced spam protection', included: true },
				{ name: 'CSV/JSON export', included: true },
				{ name: 'Webhooks', included: true },
				{ name: 'API access (read-only)', included: true },
				{ name: 'Custom email templates', included: true },
				{ name: 'Bulk operations', included: true },
				{ name: 'File virus scanning', included: true },
				{ name: 'Advanced search/filters', included: true }
			],
			cta: 'Start Pro Trial',
			ctaVariant: 'fancy' as const,
			popular: true
		},
		{
			name: 'Business',
			icon: Building2,
			price: data.pricing.business,
			description: 'For large teams and enterprises',
			features: [
				{ name: '100 Spaces', included: true },
				{ name: 'Unlimited Forms', included: true },
				{ name: 'Unlimited Users', included: true },
				{ name: '50,000 Submissions/month', included: true },
				{ name: '50GB Storage', included: true },
				{ name: 'Up to 3 years retention', included: true },
				{ name: 'Email notifications', included: true },
				{ name: 'Advanced spam protection', included: true },
				{ name: 'CSV/JSON export', included: true },
				{ name: 'Webhooks', included: true },
				{ name: 'API access (full)', included: true },
				{ name: 'Custom email templates', included: true },
				{ name: 'Bulk operations', included: true },
				{ name: 'File virus scanning', included: true },
				{ name: 'Advanced search/filters', included: true },
				{ name: 'Remove "Powered by" badge', included: true },
				{ name: 'Priority support (12hr)', included: true }
			],
			cta: 'Contact Sales',
			ctaVariant: 'outline' as const,
			popular: false
		}
	];

	let billingCycle = $state<'monthly' | 'annual'>('monthly');
</script>

<svelte:head>
	<title>Pricing - Form Capture Platform</title>
	<meta name="description" content="Simple, transparent pricing for your form capture needs" />
</svelte:head>

<div class="container mx-auto px-4 py-16">
	<!-- Header -->
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
			Simple, Transparent Pricing
		</h1>
		<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
			Choose the plan that's right for you. No hidden fees, no surprises.
		</p>

		<!-- Billing Toggle -->
		<div class="mt-8 inline-flex items-center gap-4 rounded-lg bg-muted p-1">
			<button
				onclick={() => (billingCycle = 'monthly')}
				class="rounded-md px-4 py-2 text-sm font-medium transition-colors {billingCycle ===
				'monthly'
					? 'bg-background shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				Monthly
			</button>
			<button
				onclick={() => (billingCycle = 'annual')}
				class="rounded-md px-4 py-2 text-sm font-medium transition-colors {billingCycle === 'annual'
					? 'bg-background shadow-sm'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				Annual
				<span class="ml-2 text-xs text-green-600 dark:text-green-400">Save up to 20%</span>
			</button>
		</div>

		<!-- Trust Indicators -->
		<div class="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
			<div class="flex items-center gap-2">
				<Check class="h-4 w-4 text-green-600" />
				<span>No credit card required</span>
			</div>
			<div class="flex items-center gap-2">
				<Check class="h-4 w-4 text-green-600" />
				<span>Cancel anytime</span>
			</div>
			<div class="flex items-center gap-2">
				<Check class="h-4 w-4 text-green-600" />
				<span>14-day money-back guarantee</span>
			</div>
		</div>
	</div>

	<!-- Pricing Cards -->
	<div class="mb-16 mt-6 grid gap-8 md:grid-cols-3">
		{#each tiers as tier}
			<div class="relative">
				{#if tier.popular}
					<div
						class="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1 text-xs font-semibold text-white"
					>
						Most Popular
					</div>
				{/if}

				<Card.Root class="mt-6 relative h-full {tier.popular ? 'border-primary shadow-lg' : ''}">
					<Card.Header>
						{@const Icon = tier.icon}
						<div class="mb-4 flex items-center gap-3">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-lg {tier.popular
									? 'bg-gradient-to-br from-purple-600 to-pink-600'
									: 'bg-muted'}"
							>
								<Icon class="h-6 w-6 {tier.popular ? 'text-white' : 'text-muted-foreground'}" />
							</div>
							<div>
								<Card.Title class="text-2xl">{tier.name}</Card.Title>
								<p class="text-sm text-muted-foreground">{tier.description}</p>
							</div>
						</div>

						<div class="mb-4">
							{#if tier.price.monthly === 0}
								<div class="text-4xl font-bold">Free</div>
								<p class="text-sm text-muted-foreground">Forever</p>
							{:else}
								<div class="text-4xl font-bold">
									${billingCycle === 'monthly' ? tier.price.monthly : Math.floor(tier.price.annual / 12)}
									<span class="text-lg font-normal text-muted-foreground">/month</span>
								</div>
								{#if billingCycle === 'annual'}
									<p class="text-sm text-muted-foreground">
										${tier.price.annual}/year (save ${tier.price.monthly * 12 - tier.price.annual})
									</p>
								{/if}
							{/if}
						</div>
					</Card.Header>

					<Card.Content class="space-y-4">
						<Button href="/register" variant={tier.ctaVariant} class="w-full" size="lg" tracking={tier.popular}>
							{tier.cta}
						</Button>

						<ul class="space-y-3">
							{#each tier.features as feature}
								<li class="flex items-start gap-3 text-sm">
									{#if feature.included}
										<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
									{:else}
										<X class="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
									{/if}
									<span class={feature.included ? '' : 'text-muted-foreground'}>
										{feature.name}
									</span>
								</li>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			</div>
		{/each}
	</div>

	<!-- Add-ons Section -->
	<div class="mb-16 rounded-lg bg-muted p-8">
		<h2 class="mb-4 text-center text-2xl font-bold">Add-ons (Pro & Business only)</h2>
		<div class="grid gap-6 md:grid-cols-2">
			<div class="rounded-lg bg-background p-6">
				<h3 class="mb-2 text-lg font-semibold">Extra Submissions</h3>
				<p class="text-muted-foreground mb-4">$10 per 1,000 submissions</p>
				<p class="text-sm text-muted-foreground">
					Auto-billed monthly when overage mode is enabled. Perfect for seasonal spikes.
				</p>
			</div>
			<div class="rounded-lg bg-background p-6">
				<h3 class="mb-2 text-lg font-semibold">Extra Storage</h3>
				<p class="text-muted-foreground mb-4">$5 per 5GB</p>
				<p class="text-sm text-muted-foreground">
					Auto-billed monthly when overage mode is enabled. Only pay for what you use.
				</p>
			</div>
		</div>
	</div>

	<!-- FAQ Section -->
	<div class="mx-auto max-w-3xl">
		<h2 class="mb-8 text-center text-3xl font-bold">Frequently Asked Questions</h2>
		<div class="space-y-6">
			<div>
				<h3 class="mb-2 text-lg font-semibold">Can I change plans anytime?</h3>
				<p class="text-muted-foreground">
					Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately,
					and we'll prorate your billing accordingly.
				</p>
			</div>

			<div>
				<h3 class="mb-2 text-lg font-semibold">What happens if I exceed my limits?</h3>
				<p class="text-muted-foreground">
					Pro and Business plans can enable overage billing to automatically accept submissions beyond
					your limit at $10 per 1,000 submissions. Alternatively, forms will pause until your next
					billing cycle. Free tier forms pause when limits are reached.
				</p>
			</div>

			<div>
				<h3 class="mb-2 text-lg font-semibold">Do you charge per user?</h3>
				<p class="text-muted-foreground">
					No! Unlike other platforms, we don't charge per seat. You can add team members up to your
					plan's limit without additional fees.
				</p>
			</div>

			<div>
				<h3 class="mb-2 text-lg font-semibold">What payment methods do you accept?</h3>
				<p class="text-muted-foreground">
					We accept all major credit cards. Annual plans can be paid via invoice for Business tier
					customers.
				</p>
			</div>

			<div>
				<h3 class="mb-2 text-lg font-semibold">Is there a free trial?</h3>
				<p class="text-muted-foreground">
					The Free plan is available forever with no credit card required. Pro and Business plans
					include a 14-day trial so you can test all premium features risk-free.
				</p>
			</div>
		</div>
	</div>

	<!-- CTA Section -->
	<div class="mt-16 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center text-white">
		<h2 class="mb-4 text-3xl font-bold">Ready to get started?</h2>
		<p class="mb-6 text-lg opacity-90">
			Join thousands of teams capturing forms effortlessly
		</p>
		<div class="flex justify-center gap-4">
			<Button href="/register" variant="secondary" size="lg">
				Start Free
			</Button>
			<Button href="/contact" variant="outline" size="lg" class="border-white text-white hover:bg-white/10">
				Contact Sales
			</Button>
		</div>
	</div>
</div>
