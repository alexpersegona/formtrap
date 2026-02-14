<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { EmeraldButton } from '$lib/components/ui/emerald-button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import AnimatedWaveBg from '$lib/components/animated-wave-bg.svelte';
	import AnimatedAuroraBg from '$lib/components/animated-aurora-bg.svelte';
	import AnimatedAuroraSubtleBg from '$lib/components/animated-aurora-subtle-bg.svelte';
	import {
		Database,
		Code,
		Users,
		HardDrive,
		Form,
		Lock,
		Zap,
		Server,
		Upload,
		Shield,
		ArrowRight
	} from 'lucide-svelte';
	import BrandIcon from '$lib/components/brand-icons.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

	let clientSpacesHovered = $state(false);
	let simpleEndpointsHovered = $state(false);
	let byoiHovered = $state(false);
</script>

<AnimatedWaveBg height="800px" fade="bottom" />
<AnimatedAuroraBg height="800px" fade="bottom" />
<AnimatedAuroraSubtleBg height="800px" fade="bottom" />

<div class="container relative z-1 mx-auto px-4 py-8">
	<!-- Hero Section -->
	<section class="py-20 lg:py-32">
		<div class="max-w-4xl mx-auto text-center">
			<h1 class="mb-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl text-foreground">
				The simplest way to capture
				<span class="text-transparent bg-gradient-to-r from-primary to-green-500 l c h ) bg-clip-text">
					form submissions
				</span>
				for static sites.
			</h1>
			<p class="max-w-2xl mx-auto mb-8 text-xl leading-relaxed text-muted-foreground">
				A form endpoint built for freelance developers — no builders, no bloat. Just powerful
				submission capture with client access built in. Bring your own database and storage.
			</p>
			<div class="flex flex-col items-center justify-center gap-4 mb-16 sm:flex-row">
				<EmeraldButton variant="lighter" class="h-12 px-8 text-base shadow-lg hover:shadow-lg" href="/register">
					Get Started Free
					<ArrowRight class="w-4 h-4 ml-2" />
				</EmeraldButton>
				<Button variant="primary_outline" size="lg" shadow class="h-12 px-8" href="#docs">View Docs</Button>
			</div>

		</div>
	</section>

	<!-- Feature Cards -->
	<section class="py-12">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
			<Card.Root
				class="hover:border-primary/30 transition-[translate,box-shadow,border-color] duration-500 ease-out hover:shadow-lg hover:-translate-y-2"
				onmouseenter={() => clientSpacesHovered = true}
				onmouseleave={() => clientSpacesHovered = false}
			>
				<Card.Header>
					<div class="flex items-center justify-center w-12 h-12 mb-4 rounded-lg shadow-sm bg-gradient-to-br from-primary/20 to-accent/20">
						<Users class="w-6 h-6 text-primary" />
					</div>
					<Card.Title class="text-lg pb-2">
						<span class="relative inline-block">
							Client Spaces
							<span
								class="absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-500 ease-out {clientSpacesHovered ? 'w-full' : 'w-0'}"
							></span>
						</span>
					</Card.Title>
					<Card.Description>
						Direct access for your clients to manage their submissions.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						Your clients can login to their own space to access form submissions themselves.
						No more downloading and forwarding CSVs.
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root
				class="hover:border-primary/30 transition-[translate,box-shadow,border-color] duration-500 ease-out hover:shadow-lg hover:-translate-y-2"
				onmouseenter={() => simpleEndpointsHovered = true}
				onmouseleave={() => simpleEndpointsHovered = false}
			>
				<Card.Header>
					<div class="flex items-center justify-center w-12 h-12 mb-4 rounded-lg shadow-sm bg-gradient-to-br from-primary/20 to-accent/20">
						<Code class="w-6 h-6 text-primary" />
					</div>
					<Card.Title class="text-lg pb-2">
						<span class="relative inline-block">
							Simple Endpoints
							<span
								class="absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-500 ease-out {simpleEndpointsHovered ? 'w-full' : 'w-0'}"
							></span>
						</span>
					</Card.Title>
					<Card.Description>
						For developers who just want a POST endpoint.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						Point your HTML form at our endpoint and we'll handle the rest. No SDKs, no
						JavaScript required. Works with any static site.
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root
				class="hover:border-primary/30 transition-[translate,box-shadow,border-color] duration-500 ease-out hover:shadow-lg hover:-translate-y-2"
				onmouseenter={() => byoiHovered = true}
				onmouseleave={() => byoiHovered = false}
			>
				<Card.Header>
					<div class="flex items-center justify-center w-12 h-12 mb-4 rounded-lg shadow-sm bg-gradient-to-br from-primary/20 to-accent/20">
						<HardDrive class="w-6 h-6 text-primary" />
					</div>
					<Card.Title class="text-lg pb-2">
						<span class="relative inline-block">
							Bring Your Own Infra
							<span
								class="absolute -bottom-1 left-0 h-[2px] bg-primary transition-all duration-500 ease-out {byoiHovered ? 'w-full' : 'w-0'}"
							></span>
						</span>
					</Card.Title>
					<Card.Description>
						Paste your connection string and you're live.
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<p class="text-sm text-muted-foreground">
						Grab credentials from Neon, Supabase, or any PostgreSQL provider — paste them in — done.
						Full data ownership with zero vendor lock-in.
					</p>
					<Dialog.Root>
						<Dialog.Trigger>
							<Button variant="link" size="sm">Learn More</Button>
						</Dialog.Trigger>
						<Dialog.Content class="sm:max-w-lg">
							<Dialog.Header>
								<Dialog.Title>Bring Your Own Infrastructure</Dialog.Title>
								<Dialog.Description class="text-base font-semibold text-primary/80 ">
									Full control, transparent pricing, zero lock-in.
								</Dialog.Description>
							</Dialog.Header>
							<p class="text-base text-muted-foreground leading-relaxed">
								Bring Your Own Infrastructure gives you full control from day one: your database, storage, email, and security services live in accounts you own, not behind a black box. You pay providers like Neon, Supabase, S3, R2, Mailgun, or SendGrid directly at their published rates — no markups, no reseller fees, and no surprise price hikes. This results in lower costs and more flexibility.
								<br> <br>
								Many of these providers offer generous free tiers, meaning early-stage usage often costs nothing. As you grow, you can scale or swap best-in-class services on your terms, keeping costs predictable and avoiding vendor lock-in.
							</p>
						</Dialog.Content>
					</Dialog.Root>
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<!-- Icon Feature Blocks -->
	<section class="py-16 max-w-4xl mx-auto">
		<div class="grid md:grid-cols-2 gap-6 lg:gap-12">
			<div class="space-y-6 lg:space-y-10">
				<div class="flex gap-x-5 sm:gap-x-8">
					<Database class="shrink-0 mt-2 size-8 text-primary" />
					<div class="grow">
						<h3 class="text-base sm:text-lg font-semibold text-foreground">
							Submission Data
						</h3>
						<p class="mt-1 text-muted-foreground">
							You and your clients can access all submission data in a clean interface.
							Clients view their own submissions for any forms in their space.
						</p>
					</div>
				</div>

				<div class="flex gap-x-5 sm:gap-x-8">
					<Server class="shrink-0 mt-2 size-8 text-primary" />
					<div class="grow">
						<h3 class="text-base sm:text-lg font-semibold text-foreground">
							Your PostgreSQL
						</h3>
						<p class="mt-1 text-muted-foreground">
							One connection string — that's it.
							Submissions go directly to your database. You own every byte.
						</p>
						<Tooltip.Provider>
							<div class="flex items-center gap-3 mt-3">
								<Tooltip.Root>
									<Tooltip.Trigger>
										<BrandIcon brand="neon" class="size-5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
									</Tooltip.Trigger>
									<Tooltip.Content><p>Neon</p></Tooltip.Content>
								</Tooltip.Root>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<BrandIcon brand="railway" class="size-5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
									</Tooltip.Trigger>
									<Tooltip.Content><p>Railway</p></Tooltip.Content>
								</Tooltip.Root>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<BrandIcon brand="supabase" class="size-5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
									</Tooltip.Trigger>
									<Tooltip.Content><p>Supabase</p></Tooltip.Content>
								</Tooltip.Root>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<BrandIcon brand="planetscale" class="size-5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
									</Tooltip.Trigger>
									<Tooltip.Content><p>PlanetScale</p></Tooltip.Content>
								</Tooltip.Root>
							</div>
						</Tooltip.Provider>
					</div>
				</div>

				<div class="flex gap-x-5 sm:gap-x-8">
					<Upload class="shrink-0 mt-2 size-8 text-primary" />
					<div class="grow">
						<h3 class="text-base sm:text-lg font-semibold text-foreground">
							Your Object Storage
						</h3>
						<p class="mt-1 text-muted-foreground">
							Drop in your bucket credentials and start receiving files.
							No FormTrap storage limits.
						</p>
						<Tooltip.Provider>
							<div class="flex items-center gap-3 mt-3">
								<Tooltip.Root>
									<Tooltip.Trigger>
										<BrandIcon brand="cloudflare" class="size-5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
									</Tooltip.Trigger>
									<Tooltip.Content><p>Cloudflare R2</p></Tooltip.Content>
								</Tooltip.Root>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<BrandIcon brand="aws" class="size-5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
									</Tooltip.Trigger>
									<Tooltip.Content><p>AWS S3</p></Tooltip.Content>
								</Tooltip.Root>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<BrandIcon brand="backblaze" class="size-5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
									</Tooltip.Trigger>
									<Tooltip.Content><p>Backblaze B2</p></Tooltip.Content>
								</Tooltip.Root>
							</div>
						</Tooltip.Provider>
					</div>
				</div>
			</div>

			<div class="space-y-6 lg:space-y-10">
				<div class="flex gap-x-5 sm:gap-x-8">
					<Form class="shrink-0 mt-2 size-8 text-primary" />
					<div class="grow">
						<h3 class="text-base sm:text-lg font-semibold text-foreground">
							Any HTML Form
						</h3>
						<p class="mt-1 text-muted-foreground">
							Works with any HTML, CSS, or JavaScript. No proprietary form builder lock-in.
							Just set the action attribute and go.
						</p>
					</div>
				</div>

				<div class="flex gap-x-5 sm:gap-x-8">
					<Shield class="shrink-0 mt-2 size-8 text-primary" />
					<div class="grow">
						<h3 class="text-base sm:text-lg font-semibold text-foreground">
							Spam Protection
						</h3>
						<p class="mt-1 text-muted-foreground">
							Choose your spam defense — Turnstile, reCAPTCHA, hCaptcha, or simple honeypot
							fields. Built-in protection against junk submissions.
						</p>
					</div>
				</div>

				<div class="flex gap-x-5 sm:gap-x-8">
					<Lock class="shrink-0 mt-2 size-8 text-primary" />
					<div class="grow">
						<h3 class="text-base sm:text-lg font-semibold text-foreground">
							Encrypted Credentials
						</h3>
						<p class="mt-1 text-muted-foreground">
							Your database and storage credentials are encrypted with AES-256-GCM. We
							can't read them, and neither can anyone else.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Comparison Table -->
	<section class="py-20">
		<div class="max-w-4xl mx-auto">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-3xl font-black text-foreground">Why FormTrap?</h2>
				<p class="text-lg text-muted-foreground">
					Stop compromising. Get a form backend that works the way you do.
				</p>
			</div>

			<div
				class="overflow-hidden border rounded-lg shadow-xl bg-card text-card-foreground border-primary "
			>
				<div class="p-6 bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm">
					<div class="grid grid-cols-3 gap-4">
						<div></div>
						<h3
							class="font-semibold text-center text-transparent bg-gradient-to-b from-primary to-accent bg-clip-text"
						>
							FormTrap
						</h3>
						<h3 class="font-semibold text-center text-muted-foreground">Form Builders</h3>
					</div>
				</div>

				<div class="divide-y divide-border/30">
					<div
						class="grid grid-cols-3 gap-4 p-4 transition-colors duration-200 hover:bg-muted/20"
					>
						<div class="font-medium text-foreground">Setup time</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-green-500 to-green-700"
							>
								<Zap class="w-3 h-3 text-white" />
							</div>
							<span class="text-sm font-medium">5 minutes</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-red-500 to-red-700"
							>
								<span class="text-white text-xs font-bold">x</span>
							</div>
							<span class="text-sm text-muted-foreground">Hours of configuration</span>
						</div>
					</div>

					<div
						class="grid grid-cols-3 gap-4 p-4 transition-colors duration-200 hover:bg-muted/20"
					>
						<div class="font-medium text-foreground">Client access</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-green-500 to-green-700"
							>
								<Zap class="w-3 h-3 text-white" />
							</div>
							<span class="text-sm font-medium">Built-in spaces</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-red-500 to-red-700"
							>
								<span class="text-white text-xs font-bold">x</span>
							</div>
							<span class="text-sm text-muted-foreground">None — submissions emailed out</span>
						</div>
					</div>

					<div
						class="grid grid-cols-3 gap-4 p-4 transition-colors duration-200 hover:bg-muted/20"
					>
						<div class="font-medium text-foreground">Data ownership</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-green-500 to-green-700"
							>
								<Zap class="w-3 h-3 text-white" />
							</div>
							<span class="text-sm font-medium">Paste credentials, done</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-red-500 to-red-700"
							>
								<span class="text-white text-xs font-bold">x</span>
							</div>
							<span class="text-sm text-muted-foreground">Trapped in their system</span>
						</div>
					</div>

					<div
						class="grid grid-cols-3 gap-4 p-4 transition-colors duration-200 hover:bg-muted/20"
					>
						<div class="font-medium text-foreground">Code flexibility</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-green-500 to-green-700"
							>
								<Zap class="w-3 h-3 text-white" />
							</div>
							<span class="text-sm font-medium">Any HTML/CSS/JS</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-red-500 to-red-700"
							>
								<span class="text-white text-xs font-bold">x</span>
							</div>
							<span class="text-sm text-muted-foreground">Locked to their builder</span>
						</div>
					</div>

					<div
						class="grid grid-cols-3 gap-4 p-4 transition-colors duration-200 hover:bg-muted/20"
					>
						<div class="font-medium text-foreground">Storage</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-green-500 to-green-700"
							>
								<Zap class="w-3 h-3 text-white" />
							</div>
							<span class="text-sm font-medium">Your own S3 bucket</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-red-500 to-red-700"
							>
								<span class="text-white text-xs font-bold">x</span>
							</div>
							<span class="text-sm text-muted-foreground">Metered storage fees</span>
						</div>
					</div>

					<div
						class="grid grid-cols-3 gap-4 p-4 transition-colors duration-200 hover:bg-muted/20"
					>
						<div class="font-medium text-foreground">Pricing</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-green-500 to-green-700"
							>
								<Zap class="w-3 h-3 text-white" />
							</div>
							<span class="text-sm font-medium">Flat $20/mo, unlimited</span>
						</div>
						<div class="flex items-center gap-2">
							<div
								class="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-red-500 to-red-700"
							>
								<span class="text-white text-xs font-bold">x</span>
							</div>
							<span class="text-sm text-muted-foreground">Expensive tiered plans</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
