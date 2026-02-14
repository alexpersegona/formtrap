<script lang="ts">
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col font-mono">
	<Header />

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer />
</div>
