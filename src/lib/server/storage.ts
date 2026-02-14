import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import { nanoid } from 'nanoid';
import { processImageCollection, imageCollections } from './image-processor';

// Initialize R2 client
function getR2Client() {
	if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
		throw new Error('R2 credentials not configured');
	}

	return new S3Client({
		region: 'auto',
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY
		}
	});
}

/**
 * Upload a file to R2 storage
 * @param file - The file to upload
 * @param path - The directory path (e.g., 'logos', 'avatars')
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(file: File, path: string): Promise<string> {
	try {
		const client = getR2Client();
		const bucketName = env.R2_BUCKET_NAME;

		if (!bucketName) {
			throw new Error('R2_BUCKET_NAME not configured');
		}

		// Generate unique filename
		const ext = file.name.split('.').pop();
		const filename = `${nanoid()}.${ext}`;
		const key = `${path}/${filename}`;

		// Convert File to Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to R2
		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: key,
			Body: buffer,
			ContentType: file.type
		});

		await client.send(command);

		// Construct public URL
		const publicUrl = env.R2_PUBLIC_URL || `https://${bucketName}.r2.dev`;
		const fileUrl = `${publicUrl}/${key}`;

		console.log(`✅ File uploaded successfully: ${fileUrl}`);

		return fileUrl;
	} catch (error) {
		console.error('❌ Failed to upload file to R2:', error);
		throw new Error('Failed to upload file');
	}
}

/**
 * Delete a file from R2 storage
 * @param url - The public URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
	try {
		const client = getR2Client();
		const bucketName = env.R2_BUCKET_NAME;

		if (!bucketName) {
			throw new Error('R2_BUCKET_NAME not configured');
		}

		// Extract key from URL
		// URL format: https://bucket.r2.dev/path/filename.ext
		const publicUrl = env.R2_PUBLIC_URL || `https://${bucketName}.r2.dev`;
		const key = url.replace(`${publicUrl}/`, '');

		if (!key || key === url) {
			console.warn('⚠️  Could not extract key from URL:', url);
			return;
		}

		// Delete from R2
		const command = new DeleteObjectCommand({
			Bucket: bucketName,
			Key: key
		});

		await client.send(command);

		console.log(`✅ File deleted successfully: ${key}`);
	} catch (error) {
		console.error('❌ Failed to delete file from R2:', error);
		// Don't throw - deletion failures shouldn't break the flow
	}
}

/**
 * Upload an image with multiple variants (thumbnail, small, medium, large)
 * Images are automatically converted to WebP and optimized
 *
 * @param file - The image file to upload
 * @param path - The directory path (e.g., 'logos', 'avatars')
 * @param collectionName - The image collection type (e.g., 'avatar', 'spaceLogo', 'post')
 * @returns Record of variant names to URLs
 *
 * @example
 * ```typescript
 * const urls = await uploadImageCollection(file, 'avatars', 'avatar');
 * // Returns: { thumbnail: 'url1', small: 'url2', medium: 'url3', large: 'url4' }
 * ```
 */
export async function uploadImageCollection(
	file: File,
	path: string,
	collectionName: keyof typeof imageCollections
): Promise<Record<string, string>> {
	try {
		const client = getR2Client();
		const bucketName = env.R2_BUCKET_NAME;

		if (!bucketName) {
			throw new Error('R2_BUCKET_NAME not configured');
		}

		// Convert File to Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		console.log(`📸 Processing image with collection: ${collectionName}`);

		// Process image into all variants
		const variants = await processImageCollection(buffer, collectionName);

		console.log(`✨ Generated ${Object.keys(variants).length} variants`);

		// Upload all variants in parallel
		const urls: Record<string, string> = {};
		const baseFilename = nanoid();

		const uploadPromises = Object.entries(variants).map(async ([variantName, processed]) => {
			const filename = `${baseFilename}-${variantName}.webp`;
			const key = `${path}/${filename}`;

			const command = new PutObjectCommand({
				Bucket: bucketName,
				Key: key,
				Body: processed.buffer,
				ContentType: 'image/webp',
				CacheControl: 'public, max-age=31536000, immutable'
			});

			await client.send(command);

			const publicUrl = env.R2_PUBLIC_URL || `https://${bucketName}.r2.dev`;
			urls[variantName] = `${publicUrl}/${key}`;

			console.log(`✅ Uploaded ${variantName}: ${processed.width}x${processed.height}`);
		});

		await Promise.all(uploadPromises);

		return urls;
	} catch (error) {
		console.error('❌ Failed to upload image collection to R2:', error);
		throw new Error('Failed to upload image collection');
	}
}

/**
 * Delete all variants of an image collection
 * Extracts the base filename and deletes all associated variant files
 *
 * @param url - Any URL from the collection (will extract base filename)
 */
export async function deleteImageCollection(url: string): Promise<void> {
	try {
		const client = getR2Client();
		const bucketName = env.R2_BUCKET_NAME;

		if (!bucketName) {
			throw new Error('R2_BUCKET_NAME not configured');
		}

		// Extract key from URL
		const publicUrl = env.R2_PUBLIC_URL || `https://${bucketName}.r2.dev`;
		const key = url.replace(`${publicUrl}/`, '');

		if (!key || key === url) {
			console.warn('⚠️  Could not extract key from URL:', url);
			return;
		}

		// Extract base filename (remove variant suffix like "-thumbnail.webp" or "-thumbnail@2x.webp")
		const baseFilename = key.replace(/-(?:thumbnail|regular|small|medium|large)(?:@2x)?\.webp$/, '');

		// Common variant names (including @2x versions)
		const variantNames = ['thumbnail', 'thumbnail@2x', 'regular', 'regular@2x', 'small', 'medium', 'large'];

		// Delete all possible variants
		const deletePromises = variantNames.map(async (variantName) => {
			const variantKey = `${baseFilename}-${variantName}.webp`;

			try {
				const command = new DeleteObjectCommand({
					Bucket: bucketName,
					Key: variantKey
				});

				await client.send(command);
				console.log(`✅ Deleted variant: ${variantKey}`);
			} catch (error) {
				// Ignore errors for variants that don't exist
				console.log(`ℹ️  Variant not found (ok): ${variantKey}`);
			}
		});

		await Promise.all(deletePromises);
	} catch (error) {
		console.error('❌ Failed to delete image collection from R2:', error);
		// Don't throw - deletion failures shouldn't break the flow
	}
}
