<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { X } from 'lucide-svelte';

	interface Props {
		tags?: string[];
		maxTags?: number;
		placeholder?: string;
		disabled?: boolean;
		onTagsChange?: (tags: string[]) => void;
	}

	let {
		tags = $bindable([]),
		maxTags = 5,
		placeholder = 'Add email...',
		disabled = false,
		onTagsChange
	}: Props = $props();

	let inputValue = $state('');
	let inputElement: HTMLInputElement;

	function addTag() {
		const trimmed = inputValue.trim();

		if (!trimmed) return;

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(trimmed)) {
			return;
		}

		// Check if already exists
		if (tags.includes(trimmed)) {
			inputValue = '';
			return;
		}

		// Check max tags
		if (tags.length >= maxTags) {
			return;
		}

		tags = [...tags, trimmed];
		inputValue = '';
		onTagsChange?.(tags);
	}

	function removeTag(index: number) {
		tags = tags.filter((_, i) => i !== index);
		onTagsChange?.(tags);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag();
		} else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
			removeTag(tags.length - 1);
		}
	}
</script>

<div class="space-y-2">
	<!-- Tags Display -->
	{#if tags.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each tags as tag, index}
				<Badge variant="secondary" class="gap-1 pr-1">
					{tag}
					<button
						type="button"
						onclick={() => removeTag(index)}
						disabled={disabled}
						class="rounded-full hover:bg-muted-foreground/20"
					>
						<X class="h-3 w-3" />
					</button>
				</Badge>
			{/each}
		</div>
	{/if}

	<!-- Input -->
	<Input
		bind:this={inputElement}
		bind:value={inputValue}
		type="email"
		placeholder={tags.length >= maxTags ? `Maximum ${maxTags} emails` : placeholder}
		disabled={disabled || tags.length >= maxTags}
		onkeydown={handleKeydown}
		onblur={addTag}
	/>

	<!-- Helper Text -->
	<p class="text-muted-foreground text-xs">
		{tags.length} / {maxTags} emails
		{#if tags.length < maxTags}
			• Press Enter or comma to add
		{/if}
	</p>
</div>
