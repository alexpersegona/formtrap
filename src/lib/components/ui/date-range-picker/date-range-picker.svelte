<script lang="ts">
	import { RangeCalendar } from '$lib/components/ui/range-calendar';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { CalendarIcon, X } from 'lucide-svelte';
	import {
		CalendarDate,
		type DateValue,
		getLocalTimeZone,
		today
	} from '@internationalized/date';
	import { cn } from '$lib/utils';

	interface DateRange {
		start: DateValue | undefined;
		end: DateValue | undefined;
	}

	interface Props {
		value?: DateRange;
		onchange?: (value: DateRange) => void;
		placeholder?: string;
		class?: string;
		align?: 'start' | 'center' | 'end';
	}

	let {
		value = $bindable({ start: undefined, end: undefined }),
		onchange,
		placeholder = 'Select date range',
		class: className,
		align = 'end'
	}: Props = $props();

	let open = $state(false);

	const tz = getLocalTimeZone();
	const todayDate = today(tz);

	// Presets
	const presets = [
		{ label: 'Today', days: 0 },
		{ label: 'Last 7 days', days: 7 },
		{ label: 'Last 30 days', days: 30 },
		{ label: 'Last 90 days', days: 90 }
	];

	function applyPreset(days: number) {
		const end = todayDate;
		const start = days === 0 ? todayDate : todayDate.subtract({ days: days - 1 });
		value = { start, end };
		onchange?.(value);
		open = false;
	}

	function clearRange() {
		value = { start: undefined, end: undefined };
		onchange?.(value);
	}

	function handleValueChange(newValue: DateRange) {
		value = newValue;
		// Close popover when both dates are selected
		if (newValue.start && newValue.end) {
			onchange?.(newValue);
			open = false;
		}
	}

	// Format for display
	function formatDate(date: DateValue | undefined): string {
		if (!date) return '';
		return new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const displayText = $derived(() => {
		if (value.start && value.end) {
			return `${formatDate(value.start)} - ${formatDate(value.end)}`;
		}
		if (value.start) {
			return `${formatDate(value.start)} - ...`;
		}
		return placeholder;
	});

	const hasValue = $derived(value.start || value.end);
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				size="sm"
				class={cn(
					'justify-start text-left font-normal',
					!hasValue && 'text-muted-foreground',
					className
				)}
			>
				<CalendarIcon class="mr-2 h-4 w-4" />
				<span class="truncate">{displayText()}</span>
				{#if hasValue}
					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation();
							clearRange();
						}}
						class="ml-2 rounded-full p-0.5 hover:bg-accent"
					>
						<X class="h-3 w-3" />
					</button>
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0" {align}>
		<div class="flex">
			<!-- Presets -->
			<div class="flex flex-col gap-1 border-r p-3">
				<p class="text-xs font-medium text-muted-foreground mb-2">Quick Select</p>
				{#each presets as preset}
					<Button
						variant="ghost"
						size="sm"
						class="justify-start text-xs"
						onclick={() => applyPreset(preset.days)}
					>
						{preset.label}
					</Button>
				{/each}
			</div>
			<!-- Calendar -->
			<div class="p-3">
				<RangeCalendar
					bind:value
					onValueChange={handleValueChange}
					numberOfMonths={2}
					initialFocus
				/>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
