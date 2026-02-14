<script lang="ts">
	import { PUBLIC_APP_NAME } from '$env/static/public';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background px-4">
	<!-- Optional: Simple logo/back to home -->
	<a href="/" class="mb-8 flex items-center space-x-2 hover:opacity-80 transition-opacity">
		<div class="h-8 w-8 rounded bg-primary"></div>
		<span class="text-xl font-bold">{PUBLIC_APP_NAME}</span>
	</a>

	<div class="w-full">
		{@render children()}
	</div>
</div>
