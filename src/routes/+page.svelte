<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Hero Section -->
	<div class="text-center space-y-6 py-12">
		<h1 class="text-4xl font-bold tracking-tight sm:text-6xl">Welcome to SvelteKit</h1>
		<p class="text-xl text-muted-foreground max-w-2xl mx-auto">
			Build modern web applications with SvelteKit and ShadCN components.
			Fast, accessible, and beautiful by default.
		</p>
		<div class="flex gap-4 justify-center">
			<Button size="lg">Get Started</Button>
			<Button variant="outline" size="lg">Learn More</Button>
		</div>
	</div>

	<!-- Features Section -->
	<div class="py-12">
		<h2 class="text-3xl font-bold text-center mb-8">Features</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Fast Development</Card.Title>
					<Card.Description>
						Hot module replacement and instant feedback for rapid development.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						Built on Vite for lightning-fast builds and development experience.
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Beautiful Components</Card.Title>
					<Card.Description>
						Pre-built accessible components with Tailwind CSS styling.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						ShadCN components that work seamlessly with SvelteKit.
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Type Safe</Card.Title>
					<Card.Description>
						Full TypeScript support with excellent developer experience.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						End-to-end type safety from components to API routes.
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Component Showcase -->
	<div class="py-12">
		<h2 class="text-3xl font-bold text-center mb-8">Component Showcase</h2>
		<div class="space-y-4">
			<p class="text-lg text-center text-muted-foreground mb-6">
				Testing shadcn-svelte components:
			</p>

			<div class="flex flex-wrap gap-4 justify-center">
				<Button>Default Button</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="destructive">Destructive</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="ghost">Ghost</Button>
			</div>
		</div>
	</div>
</div>
