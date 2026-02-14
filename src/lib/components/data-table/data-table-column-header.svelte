<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowUpDown, ArrowUp, ArrowDown } from '@lucide/svelte';
	import type { Column } from './types';

	interface Props {
		column: Column;
		sortBy: string;
		sortOrder: 'asc' | 'desc';
		onSort: (columnId: string) => void;
	}

	let { column, sortBy, sortOrder, onSort }: Props = $props();

	let isSorted = $derived(sortBy === column.id);
	let alignClass = $derived(
		column.align === 'center' ? 'mx-auto' : column.align === 'right' ? 'ml-auto' : '-ml-4'
	);
</script>

{#if column.sortable}
	<Button
		variant="ghost"
		onclick={() => onSort(column.id)}
		class="{alignClass} h-8 flex items-center gap-1"
	>
		{column.label}
		{#if isSorted}
			{#if sortOrder === 'asc'}
				<ArrowUp class="h-4 w-4" />
			{:else}
				<ArrowDown class="h-4 w-4" />
			{/if}
		{:else}
			<ArrowUpDown class="h-4 w-4 opacity-50" />
		{/if}
	</Button>
{:else}
	<span class={column.align === 'center' ? 'text-center block' : ''}>{column.label}</span>
{/if}
