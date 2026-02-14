<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
</script>




<div class="container mx-auto px-4 py-12">
	<div class="max-w-4xl mx-auto text-center space-y-6">
		<h1 class="text-4xl font-bold tracking-tight">Pricing</h1>
		<p class="text-xl text-muted-foreground">
			This is a placeholder page. Pricing plans coming soon.
		</p>


		<Card.Root>
			<Card.Header>
				<Card.Title>Pricing</Card.Title>
				<Card.Description>Description here.</Card.Description>

			</Card.Header>
			<Card.Content>
				<p>This is a placeholder page. Pricing plans coming soon.</p>
				<Card.Action>
					<Button variant="link">Sign Up</Button>
				</Card.Action>
			</Card.Content>
		</Card.Root>

	</div>
</div>
