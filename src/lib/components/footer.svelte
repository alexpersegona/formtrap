<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';

	const currentYear = new Date().getFullYear();
</script>

<footer class="border-t bg-background">
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
			<div class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
				<p class="text-center text-sm leading-loose text-muted-foreground md:text-left">
					© {currentYear} SvelteKit. All rights reserved.
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
				<a
					href="/about"
					class="hover:text-foreground transition-colors"
				>
					About
				</a>
				<Separator orientation="vertical" class="h-4" />
				<a
					href="/contact"
					class="hover:text-foreground transition-colors"
				>
					Contact
				</a>
				<Separator orientation="vertical" class="h-4" />
				<a
					href="/terms"
					class="hover:text-foreground transition-colors"
				>
					Terms
				</a>
				<Separator orientation="vertical" class="h-4" />
				<a
					href="/privacy"
					class="hover:text-foreground transition-colors"
				>
					Privacy
				</a>
			</div>
		</div>
	</div>
</footer>
