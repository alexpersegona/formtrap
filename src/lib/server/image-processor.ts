import sharp from 'sharp';

/**
 * Processed image result with metadata
 */
export interface ProcessedImage {
	buffer: Buffer;
	width: number;
	height: number;
	format: 'webp';
}

/**
 * Configuration for a single image variant
 */
export interface ImageVariant {
	name: string;
	maxWidth: number;
	maxHeight: number;
	quality: number;
	withRetina?: boolean; // Generate @2x version at double resolution
	fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
	position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'entropy' | 'attention';
}

/**
 * Collection of variants for a specific image type
 */
export interface ImageCollection {
	variants: ImageVariant[];
}

/**
 * Pre-configured image collections for different use cases
 */
export const imageCollections = {
	avatar: {
		variants: [
			{
				name: 'thumbnail',
				maxWidth: 60,
				maxHeight: 60,
				quality: 85,
				withRetina: true,
				fit: 'cover' as const,
				position: 'attention' as const
			},
			{
				name: 'regular',
				maxWidth: 250,
				maxHeight: 250,
				quality: 90,
				withRetina: true,
				fit: 'cover' as const,
				position: 'attention' as const
			}
		]
	},
	spaceLogo: {
		variants: [
			{
				name: 'thumbnail',
				maxWidth: 100,
				maxHeight: 100,
				quality: 85,
				withRetina: true,
				fit: 'inside' as const
			},
			{
				name: 'regular',
				maxWidth: 250,
				maxHeight: 250,
				quality: 85,
				withRetina: true,
				fit: 'inside' as const
			}
		]
	},
	post: {
		variants: [
			{
				name: 'thumbnail',
				maxWidth: 300,
				maxHeight: 200,
				quality: 80,
				fit: 'cover' as const,
				position: 'center' as const
			},
			{
				name: 'card',
				maxWidth: 600,
				maxHeight: 400,
				quality: 85,
				fit: 'cover' as const,
				position: 'center' as const
			},
			{
				name: 'medium',
				maxWidth: 900,
				maxHeight: 600,
				quality: 85,
				fit: 'inside' as const
			},
			{
				name: 'large',
				maxWidth: 1200,
				maxHeight: 800,
				quality: 90,
				fit: 'inside' as const
			}
		]
	}
} as const;

/**
 * Process a single image variant
 */
async function processVariant(
	fileBuffer: Buffer,
	variant: ImageVariant
): Promise<ProcessedImage> {
	const buffer = await sharp(fileBuffer)
		.resize(variant.maxWidth, variant.maxHeight, {
			fit: variant.fit || 'inside',
			position: variant.position || 'center',
			withoutEnlargement: true
		})
		.webp({ quality: variant.quality })
		.toBuffer();

	const metadata = await sharp(buffer).metadata();

	return {
		buffer,
		width: metadata.width!,
		height: metadata.height!,
		format: 'webp'
	};
}

/**
 * Process an image into multiple variants based on a collection configuration
 *
 * @param fileBuffer - The original image file buffer
 * @param collectionName - The name of the collection to use (e.g., 'avatar', 'spaceLogo', 'post')
 * @returns Record of variant names to processed images
 *
 * @example
 * ```typescript
 * const variants = await processImageCollection(buffer, 'avatar');
 * // Returns: { thumbnail: {...}, 'thumbnail@2x': {...}, regular: {...}, 'regular@2x': {...} }
 * ```
 */
export async function processImageCollection(
	fileBuffer: Buffer,
	collectionName: keyof typeof imageCollections
): Promise<Record<string, ProcessedImage>> {
	const collection = imageCollections[collectionName];
	const results: Record<string, ProcessedImage> = {};

	// Process all variants in parallel for performance
	const variantPromises = collection.variants.flatMap(async (variant) => {
		const promises: Array<{ name: string; processed: ProcessedImage }> = [];

		// Process standard size
		const standardProcessed = await processVariant(fileBuffer, variant);
		promises.push(
			Promise.resolve({ name: variant.name, processed: standardProcessed })
		);

		// Process @2x version if requested
		if (variant.withRetina) {
			const retinaVariant: ImageVariant = {
				...variant,
				maxWidth: variant.maxWidth * 2,
				maxHeight: variant.maxHeight * 2
			};
			const retinaProcessed = await processVariant(fileBuffer, retinaVariant);
			promises.push(
				Promise.resolve({ name: `${variant.name}@2x`, processed: retinaProcessed })
			);
		}

		return Promise.all(promises);
	});

	const processedVariants = await Promise.all(variantPromises);

	// Flatten the array of arrays
	for (const variantGroup of processedVariants) {
		for (const { name, processed } of variantGroup) {
			results[name] = processed;
		}
	}

	return results;
}

/**
 * Process a single image with custom options
 *
 * @param fileBuffer - The original image file buffer
 * @param options - Custom processing options
 * @returns Processed image
 *
 * @example
 * ```typescript
 * const image = await processImage(buffer, {
 *   maxWidth: 500,
 *   maxHeight: 500,
 *   quality: 85,
 *   fit: 'cover',
 *   position: 'attention'
 * });
 * ```
 */
export async function processImage(
	fileBuffer: Buffer,
	options: {
		maxWidth?: number;
		maxHeight?: number;
		quality?: number;
		fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
		position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'entropy' | 'attention';
	} = {}
): Promise<ProcessedImage> {
	const {
		maxWidth = 1200,
		maxHeight = 1200,
		quality = 85,
		fit = 'inside',
		position = 'center'
	} = options;

	return processVariant(fileBuffer, {
		name: 'default',
		maxWidth,
		maxHeight,
		quality,
		fit,
		position
	});
}

/**
 * Validate that a file is a valid image format
 */
export async function isValidImage(fileBuffer: Buffer): Promise<boolean> {
	try {
		const metadata = await sharp(fileBuffer).metadata();
		return ['jpeg', 'png', 'webp', 'gif', 'svg', 'tiff', 'avif'].includes(
			metadata.format || ''
		);
	} catch {
		return false;
	}
}

/**
 * Get metadata from an image without processing
 */
export async function getImageMetadata(fileBuffer: Buffer) {
	return await sharp(fileBuffer).metadata();
}
