<script lang="ts">
	import { DateRangePicker } from '$lib/components/ui/date-range-picker';
	import * as Select from '$lib/components/ui/select';
	import { Mail, Filter, Archive, ShieldAlert, CheckCircle2 } from 'lucide-svelte';
	import type { DateValue } from '@internationalized/date';

	type FilterType = 'all' | 'unread' | 'resolved' | 'archived' | 'spam';

	interface DateRange {
		start: DateValue | undefined;
		end: DateValue | undefined;
	}

	interface FilterCounts {
		all: number;
		unread: number;
		resolved: number;
		archived: number;
		spam: number;
	}

	interface Props {
		filter: FilterType;
		counts: FilterCounts;
		dateRange?: DateRange;
		onFilterChange: (filter: FilterType) => void;
		onDateRangeChange?: (range: DateRange) => void;
		showSpamFilter?: boolean;
	}

	let {
		filter,
		counts,
		dateRange = $bindable({ start: undefined, end: undefined }),
		onFilterChange,
		onDateRangeChange,
		showSpamFilter = true
	}: Props = $props();

	const filters: { id: FilterType; label: string; icon: typeof Mail }[] = [
		{ id: 'all', label: 'All', icon: Mail },
		{ id: 'unread', label: 'Unread', icon: Filter },
		{ id: 'resolved', label: 'Resolved', icon: CheckCircle2 },
		{ id: 'archived', label: 'Archived', icon: Archive },
		{ id: 'spam', label: 'Spam', icon: ShieldAlert }
	];

	const visibleFilters = $derived(
		showSpamFilter ? filters : filters.filter((f) => f.id !== 'spam')
	);

	function getCount(id: FilterType): number {
		return counts[id] ?? 0;
	}

	function getFilterLabel(id: FilterType): string {
		const filterItem = filters.find((f) => f.id === id);
		return filterItem ? `${filterItem.label} (${getCount(id)})` : '';
	}

	function handleFilterValueChange(value: string) {
		onFilterChange(value as FilterType);
	}

	function handleDateRangeChange(range: DateRange) {
		dateRange = range;
		onDateRangeChange?.(range);
	}
</script>

<div class="flex items-center gap-4">
	<Select.Root type="single" value={filter} onValueChange={handleFilterValueChange}>
		<Select.Trigger size="sm" class="w-[180px]">
			{@const currentFilter = filters.find((f) => f.id === filter)}
			{@const CurrentIcon = currentFilter?.icon ?? Mail}
			<CurrentIcon class="mr-2 h-4 w-4" />
			{currentFilter?.label ?? 'Filter'} ({getCount(filter)})
		</Select.Trigger>
		<Select.Content>
			{#each visibleFilters as { id, label, icon: Icon }}
				<Select.Item value={id}>
					<Icon class="mr-2 h-4 w-4" />
					{label} ({getCount(id)})
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>

	{#if onDateRangeChange}
		<DateRangePicker
			bind:value={dateRange}
			onchange={handleDateRangeChange}
			placeholder="Date range"
		/>
	{/if}
</div>
