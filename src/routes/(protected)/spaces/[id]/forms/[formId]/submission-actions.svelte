<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { MoreHorizontal, Eye, Trash2, ShieldCheck, AlertOctagon } from 'lucide-svelte';
	import type { Submission } from './submissions-columns';

	interface Props {
		submission: Submission;
		onView: (submission: Submission) => void;
		onDelete: (submission: Submission) => void;
		onMarkAsNotSpam?: (submission: Submission) => void;
		onMarkAsSpam?: (submission: Submission) => void;
	}

	let { submission, onView, onDelete, onMarkAsNotSpam, onMarkAsSpam }: Props = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Button variant="ghost" size="icon" class="h-8 w-8 p-0">
			<span class="sr-only">Open menu</span>
			<MoreHorizontal class="h-4 w-4" />
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Label>Actions</DropdownMenu.Label>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => onView(submission)}>
			<Eye class="mr-2 h-4 w-4" />
			View Submission
		</DropdownMenu.Item>
		{#if submission.isSpam && onMarkAsNotSpam}
			<DropdownMenu.Item onclick={() => onMarkAsNotSpam(submission)}>
				<ShieldCheck class="mr-2 h-4 w-4" />
				Mark as Not Spam
			</DropdownMenu.Item>
		{:else if !submission.isSpam && onMarkAsSpam}
			<DropdownMenu.Item onclick={() => onMarkAsSpam(submission)}>
				<AlertOctagon class="mr-2 h-4 w-4" />
				Mark as Spam
			</DropdownMenu.Item>
		{/if}
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => onDelete(submission)} class="text-destructive focus:text-destructive">
			<Trash2 class="mr-2 h-4 w-4" />
			Delete
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
