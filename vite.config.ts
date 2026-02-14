import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.svelte']
	},
	optimizeDeps: {
		include: ['react', 'react-dom', '@react-email/components']
	},
	ssr: {
		noExternal: ['@react-email/components', 'react', 'react-dom']
	},
	test: {
		expect: { requireAssertions: true },
		exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', '**/*.e2e.ts', '**/.{idea,git,cache,output,temp}/**'],
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: [
						'src/**/*.svelte.{test,spec}.{js,ts}',
						'tests/**',
						'src/routes/page.svelte.spec.ts'
					],
					setupFiles: ['./vitest.setup.ts']
				}
			}
		]
	}
});
