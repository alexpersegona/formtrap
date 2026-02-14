<script lang="ts">
	import { PanelLeftClose, PanelLeftOpen } from '@lucide/svelte';

	interface Props {
		collapsed: boolean;
		onToggle: () => void;
	}

	let { collapsed, onToggle }: Props = $props();
</script>

<button
	onclick={onToggle}
	class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:flex"
	aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
>
	{#if collapsed}
		<PanelLeftOpen class="h-4 w-4" />
		<!-- <span>Expand sidebar</span> -->
	{:else}
		<PanelLeftClose class="h-4 w-4" />
		<!-- <span>Collapse sidebar</span> -->
	{/if}
</button>
