import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./vitest.setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'tests/**',
			'**/*.e2e.ts',
			'src/**/*.svelte.{test,spec}.{js,ts}',
			'**/.{idea,git,cache,output,temp}/**'
		]
	},
	resolve: {
		alias: {
			'$env/static/private': new URL('./mocks/env.ts', import.meta.url).pathname,
			'$env/dynamic/private': new URL('./mocks/env.ts', import.meta.url).pathname
		}
	}
});
