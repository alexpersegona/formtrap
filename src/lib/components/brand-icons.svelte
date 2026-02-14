<script lang="ts" module>
	export type BrandName = 'neon' | 'supabase' | 'railway' | 'planetscale' | 'cloudflare' | 'aws' | 'backblaze';
</script>

<script lang="ts">
	interface Props {
		brand: BrandName;
		class?: string;
	}

	let { brand, class: className = '' }: Props = $props();
</script>

{#if brand === 'neon'}
	<!-- Neon - simplified bolt/lightning shape -->
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M12 2L4 14h6l-2 8 10-12h-6l2-8z"/>
	</svg>
{:else if brand === 'supabase'}
	<!-- Supabase - simplified logo shape -->
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M13.5 21.5c-.3.4-.9.2-.9-.3V13h6.6c.5 0 .8-.6.5-1L12.5 2.5c-.3-.4-.9-.2-.9.3V11H5c-.5 0-.8.6-.5 1l7.2 9.5z"/>
	</svg>
{:else if brand === 'railway'}
	<!-- Railway - simplified train track shape -->
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M4 4h16v2H4V4zm0 7h16v2H4v-2zm0 7h16v2H4v-2zM7 6v12M12 6v12M17 6v12" stroke="currentColor" stroke-width="2" fill="none"/>
	</svg>
{:else if brand === 'planetscale'}
	<!-- PlanetScale - simplified planet/orbit shape -->
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
		<ellipse cx="12" cy="12" rx="8" ry="3" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-30 12 12)"/>
	</svg>
{:else if brand === 'cloudflare'}
	<!-- Cloudflare - simplified cloud shape -->
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M17.5 19H6a5 5 0 0 1-.5-9.97 7 7 0 0 1 13.64 1.97A4 4 0 0 1 17.5 19z"/>
	</svg>
{:else if brand === 'aws'}
	<!-- AWS - simplified arrow/smile shape -->
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8M6 15c1.5 2 3.5 3 6 3s4.5-1 6-3"/>
		<path d="M18 15l2 1-1.5 2" fill="none" stroke="currentColor" stroke-width="1.5"/>
	</svg>
{:else if brand === 'backblaze'}
	<!-- Backblaze - simplified flame shape -->
	<svg viewBox="0 0 24 24" fill="currentColor" class={className}>
		<path d="M12 2c-1 4-4 6-4 10a4 4 0 0 0 8 0c0-4-3-6-4-10z"/>
	</svg>
{/if}
