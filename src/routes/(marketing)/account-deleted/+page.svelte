<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Account Deleted</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<div class="max-w-2xl mx-auto">
		<Card.Root>
			<Card.Header class="text-center space-y-4">
				<div class="flex justify-center">
					<div class="rounded-full bg-destructive/10 p-3">
						<CheckCircle class="h-12 w-12 text-destructive" />
					</div>
				</div>
				<Card.Title class="text-3xl font-bold">Account Deleted</Card.Title>
				<Card.Description class="text-base">
					Your account has been permanently deleted
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-6">
				<div class="space-y-4 text-center">
					<p class="text-muted-foreground">
						We're sorry to see you go. Your account and all associated data have been permanently
						removed from our servers.
					</p>

					<div class="rounded-lg border bg-muted/50 p-4">
						<h3 class="font-semibold mb-2">What's been deleted:</h3>
						<ul class="text-sm text-muted-foreground space-y-1">
							<li>• Your profile and account information</li>
							<li>• All your uploaded files and data</li>
							<li>• Your subscription and billing history</li>
							<li>• All active sessions and API keys</li>
						</ul>
					</div>

					<p class="text-sm text-muted-foreground">
						If you deleted your account by mistake or change your mind, you'll need to create a new
						account. We cannot recover deleted accounts.
					</p>
				</div>

				<div class="flex flex-col sm:flex-row gap-3 justify-center pt-4">
					<Button variant="outline" href="/">Return Home</Button>
					<Button href="/register">Create New Account</Button>
				</div>

				<div class="text-center pt-6 border-t">
					<p class="text-sm text-muted-foreground mb-2">
						Have questions or feedback about why you left?
					</p>
					<a
						href="mailto:support@example.com"
						class="text-sm text-primary hover:underline font-medium"
					>
						Contact Support
					</a>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
