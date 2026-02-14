<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description?: string;
		cta?: Snippet;
	}

	let { title, description, cta }: Props = $props();
</script>

<div class="mb-8 flex items-center justify-between">
	<div class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
		{#if description}
			<p class="text-muted-foreground">{description}</p>
		{/if}
	</div>

	{#if cta}
		<div>
			{@render cta()}
		</div>
	{/if}
</div>
