<script lang="ts">
	import { page } from '$app/stores';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, ShieldOff, FileQuestion, Home } from 'lucide-svelte';

	// Determine icon and styling based on error code
	const errorConfig = $derived.by(() => {
		const status = $page.status;

		switch (status) {
			case 403:
				return {
					icon: ShieldOff,
					title: 'Access Denied',
					description: 'You don\'t have permission to access this resource',
					color: 'text-amber-600',
					bgColor: 'bg-amber-50'
				};
			case 404:
				return {
					icon: FileQuestion,
					title: 'Page Not Found',
					description: 'The page you\'re looking for doesn\'t exist',
					color: 'text-blue-600',
					bgColor: 'bg-blue-50'
				};
			case 500:
				return {
					icon: AlertCircle,
					title: 'Server Error',
					description: 'Something went wrong on our end',
					color: 'text-red-600',
					bgColor: 'bg-red-50'
				};
			default:
				return {
					icon: AlertCircle,
					title: 'Something Went Wrong',
					description: 'An unexpected error occurred',
					color: 'text-gray-600',
					bgColor: 'bg-gray-50'
				};
		}
	});
</script>

<svelte:head>
	<title>{$page.status} - {errorConfig.title}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card class="max-w-lg">
		<CardHeader>
			<div class="flex justify-center">
				<div class="rounded-full p-4 {errorConfig.bgColor}">
					<svelte:component this={errorConfig.icon} class="h-12 w-12 {errorConfig.color}" />
				</div>
			</div>
			<CardTitle class="text-center text-2xl">
				{errorConfig.title}
			</CardTitle>
			<CardDescription class="text-center text-base">
				{errorConfig.description}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			<!-- Error Code -->
			<div class="rounded-lg border bg-muted/50 p-4 text-center">
				<p class="text-sm text-muted-foreground">Error Code</p>
				<p class="text-2xl font-bold">{$page.status}</p>
			</div>

			<!-- Error Message (if available) -->
			{#if $page.error?.message}
				<div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
					<p class="text-sm font-medium">Details:</p>
					<p class="mt-1 text-sm text-muted-foreground">{$page.error.message}</p>
				</div>
			{/if}

			<!-- Context-specific help -->
			<div class="space-y-2 text-sm text-muted-foreground">
				{#if $page.status === 403}
					<p>This could mean:</p>
					<ul class="ml-4 mt-2 list-disc space-y-1">
						<li>You're not logged in or your session has expired</li>
						<li>You don't have the required permissions</li>
						<li>The resource is restricted to certain users</li>
					</ul>
				{:else if $page.status === 404}
					<p>This could mean:</p>
					<ul class="ml-4 mt-2 list-disc space-y-1">
						<li>The URL is incorrect or has changed</li>
						<li>The resource has been moved or deleted</li>
						<li>You followed an outdated link</li>
					</ul>
				{:else if $page.status === 500}
					<p>This could mean:</p>
					<ul class="ml-4 mt-2 list-disc space-y-1">
						<li>A temporary server issue occurred</li>
						<li>A database connection problem</li>
						<li>An unexpected error in the application</li>
					</ul>
					<p class="mt-3">
						If this persists, please contact support with the error code above.
					</p>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
				<Button variant="default" href="/" class="flex items-center gap-2">
					<Home class="h-4 w-4" />
					Go Home
				</Button>
				<Button
					variant="outline"
					onclick={() => window.history.back()}
					class="flex items-center gap-2"
				>
					← Go Back
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
