<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Code, FileText, Rocket, Shield, Database, HardDrive } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Documentation - FormTrap</title>
	<meta name="description" content="Learn how to set up FormTrap form endpoints for your static sites." />
</svelte:head>

<div class="container mx-auto px-4 py-16 max-w-4xl">
	<div class="mb-12 text-center">
		<h1 class="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Documentation</h1>
		<p class="text-muted-foreground text-lg">
			Everything you need to start capturing form submissions.
		</p>
	</div>

	<!-- Quick Start -->
	<section class="mb-16">
		<h2 class="mb-6 text-2xl font-bold flex items-center gap-2">
			<Rocket class="h-6 w-6 text-primary" />
			Quick Start
		</h2>
		<Card.Root>
			<Card.Content class="p-6 space-y-4">
				<p class="text-muted-foreground">
					Point any HTML form at your FormTrap endpoint. No JavaScript required.
				</p>
				<pre class="rounded-lg bg-muted p-4 overflow-x-auto text-sm"><code>&lt;form action="https://formtrap.io/f/YOUR_FORM_ID" method="POST"&gt;
  &lt;input type="text" name="name" placeholder="Name" /&gt;
  &lt;input type="email" name="email" placeholder="Email" /&gt;
  &lt;textarea name="message" placeholder="Message"&gt;&lt;/textarea&gt;
  &lt;button type="submit"&gt;Send&lt;/button&gt;
&lt;/form&gt;</code></pre>
				<p class="text-sm text-muted-foreground">
					That's it. Submissions appear in your dashboard (or your own database on Pro).
				</p>
			</Card.Content>
		</Card.Root>
	</section>

	<!-- Topics Grid -->
	<section class="mb-16">
		<h2 class="mb-6 text-2xl font-bold">Topics</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<Card.Root class="hover:border-primary/30 transition-colors cursor-pointer">
				<Card.Content class="p-6 flex items-start gap-4">
					<FileText class="h-6 w-6 text-primary shrink-0 mt-1" />
					<div>
						<h3 class="font-semibold mb-1">Form Setup</h3>
						<p class="text-sm text-muted-foreground">
							Creating forms, configuring fields, redirect URLs, and AJAX submissions.
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="hover:border-primary/30 transition-colors cursor-pointer">
				<Card.Content class="p-6 flex items-start gap-4">
					<Database class="h-6 w-6 text-primary shrink-0 mt-1" />
					<div>
						<h3 class="font-semibold mb-1">Connect Your Database</h3>
						<p class="text-sm text-muted-foreground">
							Setting up your PostgreSQL connection for Pro tier BYOI.
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="hover:border-primary/30 transition-colors cursor-pointer">
				<Card.Content class="p-6 flex items-start gap-4">
					<HardDrive class="h-6 w-6 text-primary shrink-0 mt-1" />
					<div>
						<h3 class="font-semibold mb-1">Connect Your Storage</h3>
						<p class="text-sm text-muted-foreground">
							Configuring S3-compatible storage for file uploads (R2, S3, B2).
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="hover:border-primary/30 transition-colors cursor-pointer">
				<Card.Content class="p-6 flex items-start gap-4">
					<Shield class="h-6 w-6 text-primary shrink-0 mt-1" />
					<div>
						<h3 class="font-semibold mb-1">Spam Protection</h3>
						<p class="text-sm text-muted-foreground">
							Honeypot fields, Turnstile, reCAPTCHA, and hCaptcha integration.
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="hover:border-primary/30 transition-colors cursor-pointer">
				<Card.Content class="p-6 flex items-start gap-4">
					<Code class="h-6 w-6 text-primary shrink-0 mt-1" />
					<div>
						<h3 class="font-semibold mb-1">AJAX & JavaScript</h3>
						<p class="text-sm text-muted-foreground">
							Submitting forms with fetch and handling responses.
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="hover:border-primary/30 transition-colors cursor-pointer">
				<Card.Content class="p-6 flex items-start gap-4">
					<Rocket class="h-6 w-6 text-primary shrink-0 mt-1" />
					<div>
						<h3 class="font-semibold mb-1">Client Spaces</h3>
						<p class="text-sm text-muted-foreground">
							Inviting clients, managing permissions, and space privacy settings.
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<!-- Placeholder notice -->
	<div class="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
		<p class="text-muted-foreground">
			Full documentation coming soon. Need help now? Reach out at
			<a href="/contact" class="text-primary underline underline-offset-4">contact</a>.
		</p>
	</div>
</div>
