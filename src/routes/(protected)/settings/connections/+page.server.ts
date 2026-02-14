import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { connection } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '$lib/server/encryption';
import { generateId } from 'better-auth';
import { evictUserConnection } from '$lib/server/user-db';
import postgres from 'postgres';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as nodemailer from 'nodemailer';

// Email provider types
type EmailProviderType = 'smtp' | 'sendgrid' | 'resend' | 'mailgun' | 'aws_ses';

interface SMTPConfig {
	provider: 'smtp';
	host: string;
	port: number;
	username: string;
	password: string;
	secure: boolean;
	fromEmail: string;
	fromName: string;
}

interface APIEmailConfig {
	provider: 'sendgrid' | 'resend' | 'mailgun' | 'aws_ses';
	apiKey: string;
	domain?: string; // Mailgun only
	accessKeyId?: string; // AWS SES only
	secretAccessKey?: string; // AWS SES only
	region?: string; // AWS SES only
	fromEmail: string;
	fromName: string;
}

type EmailConfig = SMTPConfig | APIEmailConfig;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login');
	const userId = locals.user.id;

	const conn = await db.query.connection.findFirst({
		where: eq(connection.userId, userId)
	});

	return {
		connection: conn
			? {
					dbProvider: conn.dbProvider,
					dbStatus: conn.dbStatus,
					dbLastCheckedAt: conn.dbLastCheckedAt,
					dbError: conn.dbError,
					storageProvider: conn.storageProvider,
					storageStatus: conn.storageStatus,
					storageLastCheckedAt: conn.storageLastCheckedAt,
					storageError: conn.storageError,
					spamProvider: conn.spamProvider,
					spamSiteKey: conn.spamSiteKey,
					// BYO Email fields
					emailProvider: conn.emailProvider,
					emailStatus: conn.emailStatus,
					emailLastCheckedAt: conn.emailLastCheckedAt,
					emailError: conn.emailError,
					// Schema and counters
					schemaInitialized: conn.schemaInitialized,
					schemaVersion: conn.schemaVersion,
					emailCountThisMonth: conn.emailCountThisMonth
				}
			: null,
		user: locals.user,
		pageHeader: {
			backHref: '/settings',
			backLabel: 'Back to Settings'
		}
	};
};

async function testDbConnection(connectionString: string): Promise<{ success: boolean; error?: string }> {
	let client: ReturnType<typeof postgres> | null = null;
	try {
		client = postgres(connectionString, {
			max: 1,
			connect_timeout: 10,
			idle_timeout: 5
		});
		await client`SELECT 1`;
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Failed to connect to database'
		};
	} finally {
		if (client) {
			await client.end();
		}
	}
}

async function testStorageConnection(config: {
	endpoint: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	region?: string;
}): Promise<{ success: boolean; error?: string }> {
	try {
		const s3 = new S3Client({
			endpoint: config.endpoint,
			region: config.region || 'auto',
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey
			}
		});

		const testKey = `_formtrap_test_${Date.now()}.txt`;

		// PUT test object
		await s3.send(
			new PutObjectCommand({
				Bucket: config.bucket,
				Key: testKey,
				Body: 'formtrap-connection-test',
				ContentType: 'text/plain'
			})
		);

		// DELETE test object
		await s3.send(
			new DeleteObjectCommand({
				Bucket: config.bucket,
				Key: testKey
			})
		);

		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Failed to connect to storage'
		};
	}
}

async function testEmailConnection(
	provider: EmailProviderType,
	config: EmailConfig,
	testRecipient: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const subject = 'FormTrap Email Test';
		const textBody = 'This is a test email from FormTrap to verify your email configuration is working correctly.';
		const htmlBody = `
			<div style="font-family: sans-serif; padding: 20px;">
				<h2>FormTrap Email Test</h2>
				<p>This is a test email from FormTrap to verify your email configuration is working correctly.</p>
				<p style="color: #666; font-size: 14px;">Provider: ${provider}</p>
			</div>
		`;

		switch (provider) {
			case 'smtp':
				return await testSMTP(config as SMTPConfig, testRecipient, subject, htmlBody, textBody);
			case 'sendgrid':
				return await testSendGrid(config as APIEmailConfig, testRecipient, subject, htmlBody, textBody);
			case 'resend':
				return await testResend(config as APIEmailConfig, testRecipient, subject, htmlBody, textBody);
			case 'mailgun':
				return await testMailgun(config as APIEmailConfig, testRecipient, subject, htmlBody, textBody);
			case 'aws_ses':
				return await testAWSSES(config as APIEmailConfig, testRecipient, subject, htmlBody, textBody);
			default:
				return { success: false, error: `Unknown provider: ${provider}` };
		}
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Failed to send test email'
		};
	}
}

async function testSMTP(
	config: SMTPConfig,
	to: string,
	subject: string,
	html: string,
	text: string
): Promise<{ success: boolean; error?: string }> {
	const transporter = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		auth: {
			user: config.username,
			pass: config.password
		}
	});

	await transporter.sendMail({
		from: config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail,
		to,
		subject,
		text,
		html
	});

	return { success: true };
}

async function testSendGrid(
	config: APIEmailConfig,
	to: string,
	subject: string,
	html: string,
	text: string
): Promise<{ success: boolean; error?: string }> {
	const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			personalizations: [{ to: [{ email: to }] }],
			from: { email: config.fromEmail, name: config.fromName || undefined },
			subject,
			content: [
				{ type: 'text/plain', value: text },
				{ type: 'text/html', value: html }
			]
		})
	});

	if (!response.ok) {
		const errorBody = await response.text();
		return { success: false, error: `SendGrid API error: ${response.status} - ${errorBody}` };
	}

	return { success: true };
}

async function testResend(
	config: APIEmailConfig,
	to: string,
	subject: string,
	html: string,
	text: string
): Promise<{ success: boolean; error?: string }> {
	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail,
			to: [to],
			subject,
			text,
			html
		})
	});

	if (!response.ok) {
		const errorBody = await response.text();
		return { success: false, error: `Resend API error: ${response.status} - ${errorBody}` };
	}

	return { success: true };
}

async function testMailgun(
	config: APIEmailConfig,
	to: string,
	subject: string,
	html: string,
	text: string
): Promise<{ success: boolean; error?: string }> {
	if (!config.domain) {
		return { success: false, error: 'Mailgun domain is required' };
	}

	const form = new FormData();
	form.append('from', config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail);
	form.append('to', to);
	form.append('subject', subject);
	form.append('text', text);
	form.append('html', html);

	const response = await fetch(`https://api.mailgun.net/v3/${config.domain}/messages`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`
		},
		body: form
	});

	if (!response.ok) {
		const errorBody = await response.text();
		return { success: false, error: `Mailgun API error: ${response.status} - ${errorBody}` };
	}

	return { success: true };
}

async function testAWSSES(
	config: APIEmailConfig,
	to: string,
	subject: string,
	html: string,
	text: string
): Promise<{ success: boolean; error?: string }> {
	// AWS SES requires the AWS SDK - we'll use a simple HTTP call with SigV4 signing
	// For simplicity, we'll import aws-sdk dynamically or use fetch with manual signing
	// In production, this would use the AWS SDK properly

	if (!config.accessKeyId || !config.secretAccessKey || !config.region) {
		return { success: false, error: 'AWS SES requires accessKeyId, secretAccessKey, and region' };
	}

	// For now, return a validation-only result
	// The actual sending will be done by the Go API which has AWS SDK
	// We validate the config structure here
	try {
		// Attempt to use AWS SDK if available
		const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

		const sesClient = new SESClient({
			region: config.region,
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey
			}
		});

		const command = new SendEmailCommand({
			Source: config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail,
			Destination: {
				ToAddresses: [to]
			},
			Message: {
				Subject: { Data: subject, Charset: 'UTF-8' },
				Body: {
					Html: { Data: html, Charset: 'UTF-8' },
					Text: { Data: text, Charset: 'UTF-8' }
				}
			}
		});

		await sesClient.send(command);
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : 'AWS SES send failed'
		};
	}
}

export const actions = {
	saveDatabase: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;
		const formData = await request.formData();

		const dbProvider = formData.get('dbProvider')?.toString();
		const connectionString = formData.get('connectionString')?.toString();

		if (!connectionString || connectionString.trim().length === 0) {
			return fail(400, { dbError: 'Connection string is required' });
		}

		if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
			return fail(400, { dbError: 'Invalid connection string format. Must start with postgres:// or postgresql://' });
		}

		// Test the connection
		const testResult = await testDbConnection(connectionString);

		if (!testResult.success) {
			return fail(400, { dbError: `Connection failed: ${testResult.error}` });
		}

		// Encrypt and save
		const encrypted = encrypt(connectionString);

		const existing = await db.query.connection.findFirst({
			where: eq(connection.userId, userId)
		});

		if (existing) {
			await db
				.update(connection)
				.set({
					dbProvider: dbProvider || 'custom',
					dbConnectionStringEncrypted: encrypted,
					dbStatus: 'connected',
					dbLastCheckedAt: new Date(),
					dbError: null,
					updatedAt: new Date()
				})
				.where(eq(connection.userId, userId));
		} else {
			await db.insert(connection).values({
				id: generateId(),
				userId,
				dbProvider: dbProvider || 'custom',
				dbConnectionStringEncrypted: encrypted,
				dbStatus: 'connected',
				dbLastCheckedAt: new Date(),
				dbError: null
			});
		}

		// Evict cached connection so next access uses new credentials
		await evictUserConnection(userId);

		return { dbSuccess: true };
	},

	saveStorage: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;
		const formData = await request.formData();

		const storageProvider = formData.get('storageProvider')?.toString();
		const endpoint = formData.get('endpoint')?.toString();
		const accessKeyId = formData.get('accessKeyId')?.toString();
		const secretAccessKey = formData.get('secretAccessKey')?.toString();
		const bucket = formData.get('bucket')?.toString();
		const publicUrl = formData.get('publicUrl')?.toString();
		const region = formData.get('region')?.toString();

		if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
			return fail(400, { storageError: 'All storage fields are required' });
		}

		// Test the connection
		const testResult = await testStorageConnection({
			endpoint,
			accessKeyId,
			secretAccessKey,
			bucket,
			region
		});

		if (!testResult.success) {
			return fail(400, { storageError: `Storage connection failed: ${testResult.error}` });
		}

		// Encrypt config as JSON
		const storageConfig = JSON.stringify({
			endpoint,
			accessKeyId,
			secretAccessKey,
			bucket,
			publicUrl: publicUrl || '',
			region: region || 'auto'
		});
		const encrypted = encrypt(storageConfig);

		const existing = await db.query.connection.findFirst({
			where: eq(connection.userId, userId)
		});

		if (existing) {
			await db
				.update(connection)
				.set({
					storageProvider: storageProvider || 'cloudflare_r2',
					storageConfigEncrypted: encrypted,
					storageStatus: 'connected',
					storageLastCheckedAt: new Date(),
					storageError: null,
					updatedAt: new Date()
				})
				.where(eq(connection.userId, userId));
		} else {
			await db.insert(connection).values({
				id: generateId(),
				userId,
				storageProvider: storageProvider || 'cloudflare_r2',
				storageConfigEncrypted: encrypted,
				storageStatus: 'connected',
				storageLastCheckedAt: new Date(),
				storageError: null
			});
		}

		return { storageSuccess: true };
	},

	saveSpamProtection: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;
		const formData = await request.formData();

		const spamProvider = formData.get('spamProvider')?.toString() || 'honeypot';
		const siteKey = formData.get('siteKey')?.toString();
		const secretKey = formData.get('secretKey')?.toString();

		// Validate: non-honeypot providers need keys
		if (spamProvider !== 'honeypot') {
			if (!siteKey || !secretKey) {
				return fail(400, { spamError: 'Site key and secret key are required for this provider' });
			}
		}

		const encryptedSecret = secretKey ? encrypt(secretKey) : null;

		const existing = await db.query.connection.findFirst({
			where: eq(connection.userId, userId)
		});

		if (existing) {
			await db
				.update(connection)
				.set({
					spamProvider,
					spamSiteKey: siteKey || null,
					spamSecretKeyEncrypted: encryptedSecret,
					updatedAt: new Date()
				})
				.where(eq(connection.userId, userId));
		} else {
			await db.insert(connection).values({
				id: generateId(),
				userId,
				spamProvider,
				spamSiteKey: siteKey || null,
				spamSecretKeyEncrypted: encryptedSecret
			});
		}

		return { spamSuccess: true };
	},

	saveEmail: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;
		const testRecipient = locals.user.email; // Send test email to user's profile email
		const formData = await request.formData();

		const emailProvider = formData.get('emailProvider')?.toString() as EmailProviderType | undefined;

		if (!emailProvider) {
			return fail(400, { emailError: 'Email provider is required' });
		}

		const fromEmail = formData.get('fromEmail')?.toString();
		const fromName = formData.get('fromName')?.toString() || '';

		if (!fromEmail) {
			return fail(400, { emailError: 'From email is required' });
		}

		let config: EmailConfig;

		if (emailProvider === 'smtp') {
			const host = formData.get('host')?.toString();
			const port = parseInt(formData.get('port')?.toString() || '587');
			const username = formData.get('username')?.toString();
			const password = formData.get('password')?.toString();
			const secure = formData.get('secure')?.toString() === 'true';

			if (!host || !username || !password) {
				return fail(400, { emailError: 'SMTP host, username, and password are required' });
			}

			config = {
				provider: 'smtp',
				host,
				port,
				username,
				password,
				secure,
				fromEmail,
				fromName
			};
		} else if (emailProvider === 'mailgun') {
			const apiKey = formData.get('apiKey')?.toString();
			const domain = formData.get('domain')?.toString();

			if (!apiKey || !domain) {
				return fail(400, { emailError: 'Mailgun API key and domain are required' });
			}

			config = {
				provider: 'mailgun',
				apiKey,
				domain,
				fromEmail,
				fromName
			};
		} else if (emailProvider === 'aws_ses') {
			const accessKeyId = formData.get('accessKeyId')?.toString();
			const secretAccessKey = formData.get('secretAccessKey')?.toString();
			const region = formData.get('region')?.toString();

			if (!accessKeyId || !secretAccessKey || !region) {
				return fail(400, { emailError: 'AWS SES requires access key ID, secret access key, and region' });
			}

			config = {
				provider: 'aws_ses',
				apiKey: '', // Not used for SES
				accessKeyId,
				secretAccessKey,
				region,
				fromEmail,
				fromName
			};
		} else {
			// SendGrid or Resend - just need API key
			const apiKey = formData.get('apiKey')?.toString();

			if (!apiKey) {
				return fail(400, { emailError: 'API key is required' });
			}

			config = {
				provider: emailProvider as 'sendgrid' | 'resend',
				apiKey,
				fromEmail,
				fromName
			};
		}

		// Test the connection by sending a test email
		const testResult = await testEmailConnection(emailProvider, config, testRecipient);

		if (!testResult.success) {
			return fail(400, { emailError: `Email test failed: ${testResult.error}` });
		}

		// Encrypt and save
		const encrypted = encrypt(JSON.stringify(config));

		const existing = await db.query.connection.findFirst({
			where: eq(connection.userId, userId)
		});

		if (existing) {
			await db
				.update(connection)
				.set({
					emailProvider,
					emailConfigEncrypted: encrypted,
					emailStatus: 'connected',
					emailLastCheckedAt: new Date(),
					emailError: null,
					updatedAt: new Date()
				})
				.where(eq(connection.userId, userId));
		} else {
			await db.insert(connection).values({
				id: generateId(),
				userId,
				emailProvider,
				emailConfigEncrypted: encrypted,
				emailStatus: 'connected',
				emailLastCheckedAt: new Date(),
				emailError: null
			});
		}

		return { emailSuccess: true };
	},

	testEmail: async ({ locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;
		const testRecipient = locals.user.email;

		const conn = await db.query.connection.findFirst({
			where: eq(connection.userId, userId)
		});

		if (!conn || !conn.emailConfigEncrypted || !conn.emailProvider) {
			return fail(400, { emailError: 'No email provider configured' });
		}

		const configJSON = decrypt(conn.emailConfigEncrypted);
		const config = JSON.parse(configJSON) as EmailConfig;

		const testResult = await testEmailConnection(
			conn.emailProvider as EmailProviderType,
			config,
			testRecipient
		);

		const newStatus = testResult.success ? 'connected' : 'error';
		await db
			.update(connection)
			.set({
				emailStatus: newStatus,
				emailLastCheckedAt: new Date(),
				emailError: testResult.success ? null : testResult.error || null,
				updatedAt: new Date()
			})
			.where(eq(connection.userId, userId));

		if (!testResult.success) {
			return fail(400, { emailError: `Email test failed: ${testResult.error}` });
		}

		return { emailTestSuccess: true };
	},

	initializeSchema: async ({ locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;

		// Get user's connection
		const conn = await db.query.connection.findFirst({
			where: eq(connection.userId, userId)
		});

		if (!conn || !conn.dbConnectionStringEncrypted || conn.dbStatus !== 'connected') {
			return fail(400, { schemaError: 'Database must be connected before initializing schema' });
		}

		const connectionString = decrypt(conn.dbConnectionStringEncrypted);
		let client: ReturnType<typeof postgres> | null = null;

		try {
			client = postgres(connectionString, { max: 1, connect_timeout: 15 });

			// Create form table
			await client`
				CREATE TABLE IF NOT EXISTS form (
					id TEXT PRIMARY KEY,
					"organizationId" TEXT NOT NULL,
					name TEXT NOT NULL,
					description TEXT,
					"isActive" BOOLEAN NOT NULL DEFAULT true,
					"allowFileUploads" BOOLEAN NOT NULL DEFAULT false,
					"maxFileCount" INTEGER DEFAULT 3,
					"maxFileSize" INTEGER DEFAULT 2097152,
					"allowedFileTypes" TEXT,
					"spamCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
					"honeypotFieldName" TEXT DEFAULT 'website',
					"responseType" TEXT NOT NULL DEFAULT 'json',
					"redirectUrl" TEXT,
					"successMessage" TEXT DEFAULT 'Thank you! Your submission has been received.',
					"webhookUrl" TEXT,
					"sendEmailNotifications" BOOLEAN NOT NULL DEFAULT true,
					"notificationEmails" TEXT,
					"createdBy" TEXT NOT NULL,
					"createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
					"updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
				)
			`;

			// Create submission table
			await client`
				CREATE TABLE IF NOT EXISTS submission (
					id TEXT PRIMARY KEY,
					"formId" TEXT NOT NULL REFERENCES form(id) ON DELETE CASCADE,
					email TEXT,
					name TEXT,
					status TEXT NOT NULL DEFAULT 'new',
					"isRead" BOOLEAN NOT NULL DEFAULT false,
					"isClosed" BOOLEAN NOT NULL DEFAULT false,
					data JSONB NOT NULL,
					files JSONB,
					"associationId" TEXT,
					"ipAddress" TEXT,
					"userAgent" TEXT,
					referer TEXT,
					device TEXT,
					"deviceType" TEXT,
					os TEXT,
					browser TEXT,
					"isRobot" BOOLEAN DEFAULT false,
					"isSpam" BOOLEAN DEFAULT false,
					"spamScore" INTEGER,
					"spamReason" TEXT,
					"webhookSent" BOOLEAN DEFAULT false,
					"webhookSentAt" TIMESTAMP,
					"emailSent" BOOLEAN DEFAULT false,
					"emailSentAt" TIMESTAMP,
					"createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
					"updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
					"deletedAt" TIMESTAMP
				)
			`;

			// Create indexes
			await client`CREATE INDEX IF NOT EXISTS idx_forms_organization ON form("organizationId")`;
			await client`CREATE INDEX IF NOT EXISTS idx_forms_org_active ON form("organizationId", "isActive")`;
			await client`CREATE INDEX IF NOT EXISTS idx_submissions_form_created ON submission("formId", "createdAt")`;
			await client`CREATE INDEX IF NOT EXISTS idx_submissions_spam ON submission("isSpam") WHERE "isSpam" = true`;
			await client`CREATE INDEX IF NOT EXISTS idx_submissions_form_spam ON submission("formId", "isSpam")`;

			// Update schema status in FormTrap's DB
			await db
				.update(connection)
				.set({
					schemaInitialized: true,
					schemaVersion: 1,
					updatedAt: new Date()
				})
				.where(eq(connection.userId, userId));

			return { schemaSuccess: true };
		} catch (err) {
			console.error('Schema initialization failed:', err);
			return fail(500, {
				schemaError: `Failed to initialize schema: ${err instanceof Error ? err.message : 'Unknown error'}`
			});
		} finally {
			if (client) {
				await client.end();
			}
		}
	},

	testDatabase: async ({ locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;

		const conn = await db.query.connection.findFirst({
			where: eq(connection.userId, userId)
		});

		if (!conn || !conn.dbConnectionStringEncrypted) {
			return fail(400, { dbError: 'No database connection configured' });
		}

		const connectionString = decrypt(conn.dbConnectionStringEncrypted);
		const testResult = await testDbConnection(connectionString);

		const newStatus = testResult.success ? 'connected' : 'error';
		await db
			.update(connection)
			.set({
				dbStatus: newStatus,
				dbLastCheckedAt: new Date(),
				dbError: testResult.success ? null : testResult.error || null,
				updatedAt: new Date()
			})
			.where(eq(connection.userId, userId));

		if (!testResult.success) {
			return fail(400, { dbError: `Connection test failed: ${testResult.error}` });
		}

		return { dbTestSuccess: true };
	},

	testStorage: async ({ locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;

		const conn = await db.query.connection.findFirst({
			where: eq(connection.userId, userId)
		});

		if (!conn || !conn.storageConfigEncrypted) {
			return fail(400, { storageError: 'No storage connection configured' });
		}

		const config = JSON.parse(decrypt(conn.storageConfigEncrypted));
		const testResult = await testStorageConnection(config);

		const newStatus = testResult.success ? 'connected' : 'error';
		await db
			.update(connection)
			.set({
				storageStatus: newStatus,
				storageLastCheckedAt: new Date(),
				storageError: testResult.success ? null : testResult.error || null,
				updatedAt: new Date()
			})
			.where(eq(connection.userId, userId));

		if (!testResult.success) {
			return fail(400, { storageError: `Storage test failed: ${testResult.error}` });
		}

		return { storageTestSuccess: true };
	},

	disconnect: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');
		const userId = locals.user.id;
		const formData = await request.formData();
		const type = formData.get('type')?.toString(); // 'database' | 'storage' | 'email'

		if (type === 'database') {
			await db
				.update(connection)
				.set({
					dbConnectionStringEncrypted: null,
					dbStatus: 'disconnected',
					dbLastCheckedAt: null,
					dbError: null,
					schemaInitialized: false,
					schemaVersion: 0,
					updatedAt: new Date()
				})
				.where(eq(connection.userId, userId));

			await evictUserConnection(userId);
		} else if (type === 'storage') {
			await db
				.update(connection)
				.set({
					storageConfigEncrypted: null,
					storageStatus: 'disconnected',
					storageLastCheckedAt: null,
					storageError: null,
					updatedAt: new Date()
				})
				.where(eq(connection.userId, userId));
		} else if (type === 'email') {
			await db
				.update(connection)
				.set({
					emailProvider: null,
					emailConfigEncrypted: null,
					emailStatus: 'disconnected',
					emailLastCheckedAt: null,
					emailError: null,
					updatedAt: new Date()
				})
				.where(eq(connection.userId, userId));
		}

		return { disconnectSuccess: true, type };
	}
} satisfies Actions;
