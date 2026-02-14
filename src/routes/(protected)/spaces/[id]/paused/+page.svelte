<script lang="ts">
	import type { PageData } from './$types';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { PauseCircle, ArrowLeft, Settings } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<Card class="max-w-2xl border-red-200">
		<CardHeader>
			<div class="flex justify-center">
				<div class="rounded-full bg-red-100 p-4">
					<PauseCircle class="h-12 w-12 text-red-600" />
				</div>
			</div>
			<CardTitle class="text-center text-2xl">
				{#if data.isOwner}
					Your Space is Paused
				{:else}
					This Space is Paused
				{/if}
			</CardTitle>
			<CardDescription class="text-center text-base">
				{data.space.name}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			{#if data.isOwner}
				<!-- Owner Message -->
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
					<p class="text-sm text-amber-900">
						<strong>You are the owner of this space.</strong>
					</p>
					<p class="mt-2 text-sm text-amber-800">
						This space is currently paused. While paused, non-owner members cannot access the
						space and forms will not accept submissions. You can still access settings to manage
						the space or reactivate it.
					</p>
				</div>

				<div class="space-y-3">
					<p class="text-sm text-muted-foreground">What you can do:</p>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li class="flex items-start gap-2">
							<span class="mt-1">•</span>
							<span>Go to Settings to reactivate the space</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="mt-1">•</span>
							<span>Manage space settings and privacy options</span>
						</li>
						<li class="flex items-start gap-2">
							<span class="mt-1">•</span>
							<span>View space information</span>
						</li>
					</ul>
				</div>

				<!-- Owner Actions -->
				<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button variant="default" href="/spaces/{data.space.id}/settings">
						<Settings class="mr-2 h-4 w-4" />
						Go to Settings
					</Button>
					<Button variant="outline" href="/spaces">
						<ArrowLeft class="mr-2 h-4 w-4" />
						Back to Spaces
					</Button>
				</div>
			{:else}
				<!-- Non-Owner Message -->
				<div class="rounded-lg border border-red-200 bg-red-50 p-4">
					<p class="text-sm text-red-900">
						<strong>Access Temporarily Unavailable</strong>
					</p>
					<p class="mt-2 text-sm text-red-800">
						This space has been paused by the owner. This could be due to billing issues,
						policy violations, or temporary maintenance. Please contact the space owner for
						more information.
					</p>
				</div>

				<div class="space-y-3">
					<p class="text-sm text-muted-foreground">Possible reasons:</p>
					<ul class="space-y-2 text-sm text-muted-foreground list-disc list-inside ml-4">
						<li>
							Missed payment or subscription issue
						</li>
						<li>
							Policy violation under review
						</li>
						<li>
							Temporary maintenance or updates
						</li>
						<li>
							Owner-initiated pause for other reasons
						</li>
					</ul>
				</div>

				<!-- Non-Owner Actions -->
				<div class="flex justify-center">
					<Button variant="outline" href="/spaces">
						<ArrowLeft class="mr-2 h-4 w-4" />
						Back to Spaces
					</Button>
				</div>
			{/if}

			<!-- Space Info Footer -->
			<div class="border-t pt-4">
				<p class="text-center text-xs text-muted-foreground">
					Space created {new Date(data.space.createdAt).toLocaleDateString()}
				</p>
			</div>
		</CardContent>
	</Card>
</div>
