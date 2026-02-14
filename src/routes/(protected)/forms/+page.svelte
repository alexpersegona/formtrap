<script lang="ts">
	import PageIntro from '$lib/components/page-intro.svelte';
	import * as Card from '$lib/components/ui/card';
</script>

<PageIntro title="Forms" description="All forms across your spaces" />

<div class="space-y-6">

	<Card.Root>
		<Card.Header>
			<Card.Title>Your Forms</Card.Title>
			<Card.Description>Forms from all spaces you're part of</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-muted-foreground">
				No forms yet. This is a placeholder page - form functionality coming soon!
			</p>
		</Card.Content>
	</Card.Root>
</div>
