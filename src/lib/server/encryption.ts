/**
 * AES-256-GCM Encryption Utility
 *
 * Encrypts/decrypts sensitive credentials (DB connection strings, API keys, etc.)
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 *
 * Key must be provided via ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getKey(): Buffer {
	const key = env.ENCRYPTION_KEY;
	if (!key) {
		throw new Error('ENCRYPTION_KEY environment variable is not set');
	}
	if (key.length !== 64) {
		throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
	}
	return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @returns Encrypted string in format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
	const key = getKey();
	const iv = randomBytes(IV_LENGTH);

	const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encrypted String in format: base64(iv):base64(authTag):base64(ciphertext)
 * @returns Decrypted plaintext string
 */
export function decrypt(encrypted: string): string {
	const key = getKey();
	const parts = encrypted.split(':');

	if (parts.length !== 3) {
		throw new Error('Invalid encrypted format: expected iv:authTag:ciphertext');
	}

	const iv = Buffer.from(parts[0], 'base64');
	const authTag = Buffer.from(parts[1], 'base64');
	const ciphertext = Buffer.from(parts[2], 'base64');

	const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
	decipher.setAuthTag(authTag);

	const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	return decrypted.toString('utf8');
}
