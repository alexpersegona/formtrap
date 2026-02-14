<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import * as Card from '$lib/components/ui/card';
	import { Check, X, Zap, Crown, Database, HardDrive, Shield, Users } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Pricing - FormTrap</title>
	<meta name="description" content="Simple pricing. Free to try, $20/mo for unlimited with your own infrastructure." />
</svelte:head>

<div class="container mx-auto px-4 py-16">
	<!-- Header -->
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
			Simple, Flat Pricing
		</h1>
		<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
			Free to try. One plan when you're ready. No per-seat fees, no usage spikes.
		</p>
	</div>

	<!-- Pricing Cards -->
	<div class="mb-16 mt-8 grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
		<!-- Free Tier -->
		<Card.Root class="relative h-full">
			<Card.Header>
				<div class="mb-4 flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
						<Zap class="h-6 w-6 text-muted-foreground" />
					</div>
					<div>
						<Card.Title class="text-2xl">Free</Card.Title>
						<p class="text-sm text-muted-foreground">Try it out, no credit card needed</p>
					</div>
				</div>
				<div class="mb-4">
					<div class="text-4xl font-bold">$0</div>
					<p class="text-sm text-muted-foreground">Forever</p>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<Button href="/register" variant="outline" class="w-full" size="lg">
					Get Started
				</Button>
				<p class="text-xs text-muted-foreground text-center">Hosted on FormTrap's infrastructure</p>
				<ul class="space-y-3">
					<li class="flex items-start gap-3 text-sm">
						<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
						<span>1 Space</span>
					</li>
					<li class="flex items-start gap-3 text-sm">
						<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
						<span>1 Form</span>
					</li>
					<li class="flex items-start gap-3 text-sm">
						<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
						<span>50 Submissions</span>
					</li>
					<li class="flex items-start gap-3 text-sm">
						<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
						<span>100MB Storage</span>
					</li>
					<li class="flex items-start gap-3 text-sm">
						<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
						<span>Email notifications</span>
					</li>
					<li class="flex items-start gap-3 text-sm">
						<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
						<span>Honeypot spam protection</span>
					</li>
					<li class="flex items-start gap-3 text-sm text-muted-foreground">
						<X class="mt-0.5 h-4 w-4 flex-shrink-0" />
						<span>Bring your own database</span>
					</li>
					<li class="flex items-start gap-3 text-sm text-muted-foreground">
						<X class="mt-0.5 h-4 w-4 flex-shrink-0" />
						<span>Bring your own storage</span>
					</li>
					<li class="flex items-start gap-3 text-sm text-muted-foreground">
						<X class="mt-0.5 h-4 w-4 flex-shrink-0" />
						<span>Advanced spam (Turnstile, reCAPTCHA)</span>
					</li>
				</ul>
			</Card.Content>
		</Card.Root>

		<!-- Pro Tier -->
		<div class="relative">
			<Card.Root class="relative h-full border-primary shadow-lg">
				<Card.Header>
					<div class="mb-4 flex items-center gap-3">
						<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-green-600">
							<Crown class="h-6 w-6 text-white" />
						</div>
						<div>
							<Card.Title class="text-2xl">Pro</Card.Title>
							<p class="text-sm text-muted-foreground">Your infrastructure, unlimited scale</p>
						</div>
					</div>
					<div class="mb-4">
						<div class="text-4xl font-bold">
							$20
							<span class="text-lg font-normal text-muted-foreground">/month</span>
						</div>
						<p class="text-sm text-muted-foreground">Flat rate, no surprises</p>
					</div>
				</Card.Header>
				<Card.Content class="space-y-4">
					<EmeraldButton href="/register" variant="lighter" class="w-full h-11">
						Start Pro
					</EmeraldButton>
					<p class="text-xs text-muted-foreground text-center">Bring your own PostgreSQL + S3 storage</p>
					<ul class="space-y-3">
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span>25 Spaces</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span><strong>Unlimited</strong> Forms</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span><strong>Unlimited</strong> Submissions</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span><strong>Unlimited</strong> Storage</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span>10 Members per space</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span>Your own PostgreSQL database</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span>Your own S3-compatible storage</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span>Turnstile, reCAPTCHA, or hCaptcha</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span>AES-256-GCM encrypted credentials</span>
						</li>
						<li class="flex items-start gap-3 text-sm">
							<Check class="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
							<span>Email notifications</span>
						</li>
					</ul>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- BYOI Explainer -->
	<div class="mb-16 max-w-4xl mx-auto">
		<h2 class="mb-8 text-center text-2xl font-bold">How Bring Your Own Infrastructure Works</h2>
		<div class="grid gap-6 md:grid-cols-3">
			<div class="rounded-lg border bg-card p-6 text-center">
				<Database class="h-8 w-8 mx-auto mb-3 text-primary" />
				<h3 class="mb-2 font-semibold">Connect Your Database</h3>
				<p class="text-sm text-muted-foreground">
					Neon, Supabase, Railway, or any PostgreSQL. Your submissions go to your DB.
				</p>
			</div>
			<div class="rounded-lg border bg-card p-6 text-center">
				<HardDrive class="h-8 w-8 mx-auto mb-3 text-primary" />
				<h3 class="mb-2 font-semibold">Connect Your Storage</h3>
				<p class="text-sm text-muted-foreground">
					Cloudflare R2, AWS S3, or Backblaze B2. File uploads go to your bucket.
				</p>
			</div>
			<div class="rounded-lg border bg-card p-6 text-center">
				<Shield class="h-8 w-8 mx-auto mb-3 text-primary" />
				<h3 class="mb-2 font-semibold">Choose Spam Protection</h3>
				<p class="text-sm text-muted-foreground">
					Turnstile, reCAPTCHA, hCaptcha, or honeypot. Your choice, your keys.
				</p>
			</div>
		</div>
	</div>

	<!-- FAQ -->
	<div class="mx-auto max-w-3xl">
		<h2 class="mb-8 text-center text-3xl font-bold">FAQ</h2>
		<div class="space-y-6">
			<div>
				<h3 class="mb-2 text-lg font-semibold">Why do I need my own database?</h3>
				<p class="text-muted-foreground">
					You don't — the Free tier hosts everything for you. But on Pro, your data lives in your
					own PostgreSQL database, giving you full ownership, no vendor lock-in, and unlimited
					scale at your own infrastructure cost.
				</p>
			</div>
			<div>
				<h3 class="mb-2 text-lg font-semibold">What databases are supported?</h3>
				<p class="text-muted-foreground">
					Any PostgreSQL-compatible database. Neon, Supabase, Railway, AWS RDS, or your own
					self-hosted Postgres all work.
				</p>
			</div>
			<div>
				<h3 class="mb-2 text-lg font-semibold">Are my credentials safe?</h3>
				<p class="text-muted-foreground">
					Yes. All connection strings and API keys are encrypted with AES-256-GCM before storage.
					We cannot read your credentials.
				</p>
			</div>
			<div>
				<h3 class="mb-2 text-lg font-semibold">Can I switch from Free to Pro?</h3>
				<p class="text-muted-foreground">
					Yes, upgrade anytime. Once you connect your database and storage, new submissions
					will route to your infrastructure automatically.
				</p>
			</div>
			<div>
				<h3 class="mb-2 text-lg font-semibold">Is there a per-seat charge?</h3>
				<p class="text-muted-foreground">
					No. Pro includes up to 10 members per space at the flat $20/mo rate. No per-user fees.
				</p>
			</div>
		</div>
	</div>
</div>
