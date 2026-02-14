<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import type { Submission } from './submissions-columns';

	interface Props {
		open: boolean;
		submission: Submission | null;
		onOpenChange: (open: boolean) => void;
		onConfirm: () => void;
		loading?: boolean;
	}

	let {
		open = $bindable(false),
		submission,
		onOpenChange,
		onConfirm,
		loading = false
	}: Props = $props();
</script>

<AlertDialog.Root {open} {onOpenChange}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="backdrop-blur-sm" />
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete Submission?</AlertDialog.Title>
				<AlertDialog.Description>
					{#if submission}
						Are you sure you want to delete this submission{submission.email
							? ` from ${submission.email}`
							: ''}? This action cannot be undone.
					{:else}
						Are you sure you want to delete this submission? This action cannot be undone.
					{/if}
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel disabled={loading}>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action onclick={onConfirm} disabled={loading}>
					{loading ? 'Deleting...' : 'Delete'}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
