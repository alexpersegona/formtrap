/**
 * Intersection observer action for infinite scroll / lazy loading
 *
 * Usage:
 * ```svelte
 * <div use:intersect={loadMore}>Loading...</div>
 * ```
 */
export function intersect(node: HTMLElement, callback: () => void) {
	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) {
				callback();
			}
		},
		{
			rootMargin: '100px' // Start loading a bit before the element is visible
		}
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
