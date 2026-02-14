<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, Upload, Image as ImageIcon } from 'lucide-svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { cn } from '$lib/utils';

	interface Props {
		value?: string | null;
		name: string;
		disabled?: boolean;
		error?: string;
		maxSize?: number; // in MB
		fallbackText?: string;
		onchange?: (changed: boolean) => void;
		round?: boolean; // Controls avatar shape: true = round, false = square with rounded corners
	}

	let {
		value = null,
		name,
		disabled = false,
		error,
		maxSize = 5,
		fallbackText = '?',
		onchange,
		round = true
	}: Props = $props();

	let previewImage = $state<string | null>(value);
	let isDragging = $state(false);
	let fileInput: HTMLInputElement;
	let deleteInput: HTMLInputElement;
	let selectedFile = $state<File | null>(null);
	let markedForDeletion = $state(false);

	function handleFileChange(file: File | null) {
		if (!file) return;

		selectedFile = file;
		markedForDeletion = false; // Unmark deletion if new file is selected
		const reader = new FileReader();
		reader.onload = (e) => {
			previewImage = e.target?.result as string;
			onchange?.(true); // Notify parent that image changed
		};
		reader.readAsDataURL(file);
	}

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			handleFileChange(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const file = event.dataTransfer?.files[0];
		if (file && file.type.startsWith('image/')) {
			handleFileChange(file);
			// Update the file input
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(file);
			fileInput.files = dataTransfer.files;
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	function removeImage() {
		previewImage = null;
		selectedFile = null;
		markedForDeletion = true; // Mark for deletion
		onchange?.(true); // Notify parent that image changed (deleted)
		if (fileInput) {
			fileInput.value = '';
		}
		if (deleteInput) {
			deleteInput.value = 'true';
		}
	}

	function openFileDialog() {
		fileInput?.click();
	}
</script>

<div class="space-y-4">
	<div class="flex items-center gap-6">
		<!-- Image Preview with scale animation -->
		{#if previewImage}
			<div
				class="relative"
				in:scale={{ duration: 300, easing: cubicOut, start: 0.3 }}
				out:scale={{ duration: 200, easing: cubicOut, start: 0.4 }}
			>
				<div class={cn("h-24 w-24 overflow-hidden border bg-muted", round ? "rounded-full" : "rounded")}>
					<img
						src={previewImage}
						srcset="{previewImage} 1x, {previewImage.replace('.webp', '@2x.webp')} 2x"
						alt="Preview"
						class="h-full w-full object-cover"
					/>
				</div>

				<!-- Remove Button (always round) -->
				<Button
					type="button"
					variant="destructive"
					size="icon"
					class="absolute -top-0 -right-2 size-6 -mt-2 rounded-full shadow-lg !bg-destructive hover:!bg-destructive/90"
					onclick={removeImage}
					{disabled}
				>
					<X class="size-3" />
				</Button>
			</div>
		{/if}

		<!-- Upload Area -->
		<div class="flex-1 space-y-2 transition-all duration-300 ease-out">
			<!-- Hidden file input -->
			<input
				bind:this={fileInput}
				type="file"
				{name}
				accept="image/*"
				class="hidden"
				onchange={handleInputChange}
				{disabled}
			/>

			<!-- Hidden input to signal deletion -->
			<input
				bind:this={deleteInput}
				type="hidden"
				name="{name}_delete"
				value={markedForDeletion ? 'true' : 'false'}
			/>

			<!-- Drag and Drop Zone -->
			<button
				type="button"
				style=""
				class="dark:inset-shadow-[0_0_30px_rgba(0,0,0,0.5)] inset-shadow-[0_0_30px_rgba(0,0,0,0.1)] w-full border-2 border-dashed rounded-lg p-6 transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 {isDragging
					? 'border-primary bg-primary/5'
					: 'border-muted-foreground/25'} {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
				ondrop={handleDrop}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				onclick={openFileDialog}
				{disabled}
			>
				<div class="flex flex-col items-center gap-2 text-center">
					{#if selectedFile}
						<ImageIcon class="h-8 w-8 text-primary" />
						<div>
							<p class="text-sm font-medium">{selectedFile.name}</p>
							<p class="text-xs text-muted-foreground">
								{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
							</p>
						</div>
					{:else}
						<Upload class="h-8 w-8 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">
								Drop an image here, or click to browse
							</p>
							<p class="text-xs text-muted-foreground mt-1">
								JPG, PNG, GIF up to {maxSize}MB
							</p>
						</div>
					{/if}
				</div>
			</button>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
		</div>
	</div>
</div>
