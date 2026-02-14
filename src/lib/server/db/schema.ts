import { pgTable, text, timestamp, boolean, integer, jsonb, index, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('emailVerified').notNull().default(false),
	image: text('image'), // Legacy single URL or JSON with variants: { thumbnail, small, medium, large }
	role: text('role').notNull().default('user'),
	twoFactorEnabled: boolean('twoFactorEnabled').default(false),
	// Ban/suspend functionality
	bannedAt: timestamp('bannedAt', { withTimezone: true }),
	banReason: text('banReason'),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

export const twoFactor = pgTable('twoFactor', {
	id: text('id').primaryKey(),
	secret: text('secret').notNull(),
	backupCodes: text('backupCodes').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
		.unique()
});

// ============================================================================
// ORGANIZATION TABLES (Better Auth + Custom Extensions)
// ============================================================================

export const organization = pgTable('organization', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	logo: text('logo'), // JSON with variants: { thumbnail, small, medium, large }
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
	metadata: text('metadata'),

	// Custom fields for Spaces functionality
	isClientOwned: boolean('isClientOwned').notNull().default(false),
	privacyIndicatorEnabled: boolean('privacyIndicatorEnabled').notNull().default(true),
	isPaused: boolean('isPaused').notNull().default(false),

	// Per-space retention override (null = use subscription default)
	// Pro tier: max 365 days, Business tier: max 1095 days
	dataRetentionDays: integer('dataRetentionDays'), // nullable

	createdBy: text('createdBy')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const member = pgTable('member', {
	id: text('id').primaryKey(),
	organizationId: text('organizationId')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	role: text('role').notNull(),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

export const invitation = pgTable('invitation', {
	id: text('id').primaryKey(),
	organizationId: text('organizationId')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	role: text('role').notNull(),
	status: text('status').notNull().default('pending'),
	expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
	inviterId: text('inviterId')
		.notNull()
		.references(() => user.id),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

// ============================================================================
// FORM CAPTURE DOMAIN TABLES
// ============================================================================

export const form = pgTable('form', {
	id: text('id').primaryKey(),
	organizationId: text('organizationId')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),

	// Form configuration
	isActive: boolean('isActive').notNull().default(true),
	allowFileUploads: boolean('allowFileUploads').notNull().default(false),
	maxFileCount: integer('maxFileCount').default(3), // Max files per submission
	maxFileSize: integer('maxFileSize').default(2097152), // 2MB default
	allowedFileTypes: text('allowedFileTypes'), // JSON array as string

	// Spam protection
	spamCheckEnabled: boolean('spamCheckEnabled').notNull().default(true),
	honeypotFieldName: text('honeypotFieldName').default('website'), // Field name for honeypot

	// Response configuration
	responseType: text('responseType').notNull().default('json'), // 'redirect' | 'json'
	redirectUrl: text('redirectUrl'), // URL to redirect to after submission (if responseType = 'redirect')
	successMessage: text('successMessage').default('Thank you! Your submission has been received.'), // Message for JSON responses

	// Webhooks & notifications
	webhookUrl: text('webhookUrl'),
	sendEmailNotifications: boolean('sendEmailNotifications').notNull().default(true),
	notificationEmails: text('notificationEmails'), // JSON array as string

	createdBy: text('createdBy')
		.notNull()
		.references(() => user.id),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
	// Index for Go API: lookup form by organization + check active status
	orgIdx: index('idx_forms_organization').on(table.organizationId),
	orgActiveIdx: index('idx_forms_org_active').on(table.organizationId, table.isActive),
}));

export const submission = pgTable('submission', {
	id: text('id').primaryKey(),
	formId: text('formId')
		.notNull()
		.references(() => form.id, { onDelete: 'cascade' }),

	// Extracted contact info (from form data)
	email: text('email'), // Pulled from data for easy filtering/searching
	name: text('name'), // Pulled from data for easy display

	// Submission status
	status: text('status').notNull().default('new'), // 'new', 'read', 'resolved'
	isRead: boolean('isRead').notNull().default(false),
	isClosed: boolean('isClosed').notNull().default(false),
	isArchived: boolean('isArchived').notNull().default(false),

	// Submission data
	data: jsonb('data').notNull(), // Form field data (all form fields)
	files: jsonb('files'), // File uploads array: [{id, name, path, size, mime_type, virus_scanned, virus_detected, uploaded_at}]

	// Associations
	associationId: text('associationId'), // Nullable, can be used for linking submissions to external entities

	// Request metadata
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	referer: text('referer'),
	device: text('device'), // e.g., 'Desktop', 'Mobile', 'Tablet'
	deviceType: text('deviceType'), // e.g., 'iPhone', 'Android', 'Windows PC'
	os: text('os'), // e.g., 'iOS 17.2', 'Android 14', 'Windows 11'
	browser: text('browser'), // e.g., 'Chrome 120', 'Safari 17', 'Firefox 121'
	isRobot: boolean('isRobot').default(false), // Bot detection

	// Spam detection
	isSpam: boolean('isSpam').default(false),
	spamScore: integer('spamScore'),
	spamReason: text('spamReason'),

	// Notification tracking
	webhookSent: boolean('webhookSent').default(false),
	webhookSentAt: timestamp('webhookSentAt', { withTimezone: true }),
	emailSent: boolean('emailSent').default(false),
	emailSentAt: timestamp('emailSentAt', { withTimezone: true }),

	// Timestamps
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
	deletedAt: timestamp('deletedAt', { withTimezone: true }) // Soft delete
}, (table) => ({
	// Performance indexes for Go API queries
	formCreatedIdx: index('idx_submissions_form_created').on(table.formId, table.createdAt),
	spamIdx: index('idx_submissions_spam').on(table.isSpam).where(sql`${table.isSpam} = true`),
	formSpamIdx: index('idx_submissions_form_spam').on(table.formId, table.isSpam),
}));

// ============================================================================
// SUBSCRIPTION
// ============================================================================

export const subscription = pgTable('subscription', {
	id: text('id').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
		.unique(),

	// Subscription details
	tier: text('tier').notNull().default('free'), // 'free' | 'pro'
	status: text('status').notNull().default('active'), // 'active', 'canceled', 'past_due'

	// Payment provider integration (Stripe, Polar, etc.)
	paymentProvider: text('paymentProvider'), // 'stripe' | 'polar' | null for manual/testing
	paymentCustomerId: text('paymentCustomerId'),
	paymentSubscriptionId: text('paymentSubscriptionId'),
	paymentPriceId: text('paymentPriceId'),

	currentPeriodStart: timestamp('currentPeriodStart', { withTimezone: true }),
	currentPeriodEnd: timestamp('currentPeriodEnd', { withTimezone: true }),

	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

// ============================================================================
// BYOI CONNECTION (User's infrastructure credentials)
// ============================================================================

export const connection = pgTable('connection', {
	id: text('id').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
		.unique(),

	// Database connection
	dbProvider: text('dbProvider'), // 'neon', 'supabase', 'railway', 'custom'
	dbConnectionStringEncrypted: text('dbConnectionStringEncrypted'),
	dbStatus: text('dbStatus').notNull().default('disconnected'), // 'connected', 'disconnected', 'error'
	dbLastCheckedAt: timestamp('dbLastCheckedAt', { withTimezone: true }),
	dbError: text('dbError'),

	// Storage connection (S3-compatible)
	storageProvider: text('storageProvider'), // 'cloudflare_r2', 'aws_s3', 'backblaze_b2'
	storageConfigEncrypted: text('storageConfigEncrypted'), // JSON: {endpoint, accessKeyId, secretAccessKey, bucket, publicUrl}
	storageStatus: text('storageStatus').notNull().default('disconnected'), // 'connected', 'disconnected', 'error'
	storageLastCheckedAt: timestamp('storageLastCheckedAt', { withTimezone: true }),
	storageError: text('storageError'),

	// Spam protection
	spamProvider: text('spamProvider').notNull().default('honeypot'), // 'turnstile', 'recaptcha', 'hcaptcha', 'honeypot'
	spamSiteKey: text('spamSiteKey'),
	spamSecretKeyEncrypted: text('spamSecretKeyEncrypted'),

	// BYO Email provider
	emailProvider: text('emailProvider'), // 'smtp' | 'sendgrid' | 'resend' | 'mailgun' | 'aws_ses'
	emailConfigEncrypted: text('emailConfigEncrypted'), // JSON config encrypted
	emailStatus: text('emailStatus').notNull().default('disconnected'), // 'connected', 'disconnected', 'error'
	emailLastCheckedAt: timestamp('emailLastCheckedAt', { withTimezone: true }),
	emailError: text('emailError'),

	// Email monthly cap (for platform Mailgun fallback)
	emailCountThisMonth: integer('emailCountThisMonth').notNull().default(0),
	emailCountResetAt: timestamp('emailCountResetAt', { withTimezone: true }),

	// Schema management
	schemaInitialized: boolean('schemaInitialized').notNull().default(false),
	schemaVersion: integer('schemaVersion').notNull().default(0),

	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
});

// ============================================================================
// FORM ENDPOINT (Lightweight routing for Go API)
// ============================================================================

export const formEndpoint = pgTable('formEndpoint', {
	id: text('id').primaryKey(),
	formId: text('formId').notNull().unique(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	organizationId: text('organizationId')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	isActive: boolean('isActive').notNull().default(true),

	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
	formIdIdx: index('idx_form_endpoint_form_id').on(table.formId),
	userIdIdx: index('idx_form_endpoint_user_id').on(table.userId),
}));

// ============================================================================
// CONTACT SUBMISSIONS (Website contact form)
// ============================================================================

export const contactSubmission = pgTable('contactSubmission', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	subject: text('subject').notNull(),
	message: text('message').notNull(),
	ipAddress: text('ipAddress'),
	isRead: boolean('isRead').notNull().default(false),
	isArchived: boolean('isArchived').notNull().default(false),
	isSpam: boolean('isSpam').notNull().default(false),
	spamReason: text('spamReason'),
	createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow()
});

// ============================================================================
// IMPERSONATION AUDIT LOG (Superadmin impersonation tracking)
// ============================================================================

export const impersonationLog = pgTable('impersonationLog', {
	id: text('id').primaryKey(),
	superadminId: text('superadminId')
		.notNull()
		.references(() => user.id),
	targetUserId: text('targetUserId')
		.notNull()
		.references(() => user.id),
	startedAt: timestamp('startedAt', { withTimezone: true }).notNull().defaultNow(),
	endedAt: timestamp('endedAt', { withTimezone: true }),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent')
});

// ============================================================================
// RELATIONS
// ============================================================================

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id]
	})
}));

export const organizationRelations = relations(organization, ({ one, many }) => ({
	createdByUser: one(user, {
		fields: [organization.createdBy],
		references: [user.id]
	}),
	members: many(member),
	forms: many(form),
	invitations: many(invitation)
}));

export const formRelations = relations(form, ({ one, many }) => ({
	organization: one(organization, {
		fields: [form.organizationId],
		references: [organization.id]
	}),
	createdByUser: one(user, {
		fields: [form.createdBy],
		references: [user.id]
	}),
	submissions: many(submission)
}));

export const submissionRelations = relations(submission, ({ one }) => ({
	form: one(form, {
		fields: [submission.formId],
		references: [form.id]
	})
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id]
	}),
	inviter: one(user, {
		fields: [invitation.inviterId],
		references: [user.id]
	})
}));

export const connectionRelations = relations(connection, ({ one }) => ({
	user: one(user, {
		fields: [connection.userId],
		references: [user.id]
	})
}));

export const formEndpointRelations = relations(formEndpoint, ({ one }) => ({
	user: one(user, {
		fields: [formEndpoint.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [formEndpoint.organizationId],
		references: [organization.id]
	})
}));

export const impersonationLogRelations = relations(impersonationLog, ({ one }) => ({
	superadmin: one(user, {
		fields: [impersonationLog.superadminId],
		references: [user.id],
		relationName: 'superadmin'
	}),
	targetUser: one(user, {
		fields: [impersonationLog.targetUserId],
		references: [user.id],
		relationName: 'targetUser'
	})
}));
