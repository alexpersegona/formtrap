<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { SlidersHorizontal, RotateCcw } from '@lucide/svelte';
	import type { Column } from './types';

	interface Props {
		columns: Column[];
		visibleColumns: string[];
		defaultColumns: string[];
		onToggle: (columnId: string) => void;
		onReset: () => void;
	}

	let { columns, visibleColumns, defaultColumns, onToggle, onReset }: Props = $props();

	let hideableColumns = $derived(columns.filter((c) => c.hideable !== false));
	let hasChanges = $derived(
		visibleColumns.length !== defaultColumns.length ||
			!visibleColumns.every((c) => defaultColumns.includes(c))
	);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline">
				<SlidersHorizontal class="h-4 w-4 mr-2" />
				Columns
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-48">
		<DropdownMenu.Label>Toggle columns</DropdownMenu.Label>
		<DropdownMenu.Separator />
		{#each hideableColumns as column}
			<DropdownMenu.CheckboxItem
				checked={visibleColumns.includes(column.id)}
				onCheckedChange={() => onToggle(column.id)}
			>
				{column.label}
			</DropdownMenu.CheckboxItem>
		{/each}
		{#if hasChanges}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={onReset}>
				<RotateCcw class="h-4 w-4 mr-2" />
				Reset to default
			</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
