<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { Pagination } from './types';

	interface Props {
		pagination: Pagination;
		itemName: string;
		onPageChange: (page: number) => void;
		onLimitChange: (limit: string) => void;
	}

	let { pagination, itemName, onPageChange, onLimitChange }: Props = $props();

	let showingFrom = $derived((pagination.page - 1) * pagination.limit + 1);
	let showingTo = $derived(Math.min(pagination.page * pagination.limit, pagination.total));
</script>

{#if pagination.totalPages > 1 || pagination.total > 10}
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<p class="text-sm text-muted-foreground">
				Showing {showingFrom} to {showingTo} of {pagination.total}
				{itemName}
			</p>
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Show</span>
				<Select.Root
					type="single"
					value={pagination.limit.toString()}
					onValueChange={(v) => v && onLimitChange(v)}
				>
					<Select.Trigger class="w-[70px] h-8" size="sm">
						{pagination.limit}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="10">10</Select.Item>
						<Select.Item value="25">25</Select.Item>
						<Select.Item value="50">50</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={pagination.page <= 1}
				onclick={() => onPageChange(pagination.page - 1)}
			>
				<ChevronLeft class="h-4 w-4" />
				Previous
			</Button>
			<span class="text-sm text-muted-foreground px-2">
				Page {pagination.page} of {pagination.totalPages}
			</span>
			<Button
				variant="outline"
				size="sm"
				disabled={pagination.page >= pagination.totalPages}
				onclick={() => onPageChange(pagination.page + 1)}
			>
				Next
				<ChevronRight class="h-4 w-4" />
			</Button>
		</div>
	</div>
{/if}
