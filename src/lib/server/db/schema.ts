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
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expiresAt').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow(),
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
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expiresAt').notNull(),
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
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
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow(),
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
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
});

export const invitation = pgTable('invitation', {
	id: text('id').primaryKey(),
	organizationId: text('organizationId')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	role: text('role').notNull(),
	status: text('status').notNull().default('pending'),
	expiresAt: timestamp('expiresAt').notNull(),
	inviterId: text('inviterId')
		.notNull()
		.references(() => user.id),
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
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
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
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
	status: text('status').notNull().default('new'), // 'new', 'read', 'resolved', 'spam'
	isRead: boolean('isRead').notNull().default(false),
	isClosed: boolean('isClosed').notNull().default(false),

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
	webhookSentAt: timestamp('webhookSentAt'),
	emailSent: boolean('emailSent').default(false),
	emailSentAt: timestamp('emailSentAt'),

	// Timestamps
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow(),
	deletedAt: timestamp('deletedAt') // Soft delete
}, (table) => ({
	// Performance indexes for Go API queries
	formCreatedIdx: index('idx_submissions_form_created').on(table.formId, table.createdAt),
	spamIdx: index('idx_submissions_spam').on(table.isSpam).where(sql`${table.isSpam} = true`),
	formSpamIdx: index('idx_submissions_form_spam').on(table.formId, table.isSpam),
}));

// ============================================================================
// SUBSCRIPTION & RESOURCE MANAGEMENT
// ============================================================================

export const subscription = pgTable('subscription', {
	id: text('id').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
		.unique(),

	// Subscription details
	tier: text('tier').notNull().default('free'), // 'free', 'basic', 'pro', 'enterprise'
	status: text('status').notNull().default('active'), // 'active', 'canceled', 'past_due'

	// Resource limits from subscription tier
	maxSpaces: integer('maxSpaces').notNull().default(1),
	maxSubmissionsPerMonth: integer('maxSubmissionsPerMonth').notNull().default(100),
	maxStorageMb: integer('maxStorageMb').notNull().default(100), // 100MB
	maxUsersPerSpace: integer('maxUsersPerSpace').notNull().default(5),
	maxFormsPerSpace: integer('maxFormsPerSpace').notNull().default(3),

	// Retention and overage settings
	retentionDays: integer('retentionDays').notNull().default(30),
	overageMode: text('overageMode').notNull().default('pause'), // 'pause' | 'auto_bill'
	billingCycle: text('billingCycle').default('monthly'), // 'monthly' | 'annual'

	// Payment provider integration (Stripe, Polar, etc.)
	paymentProvider: text('paymentProvider'), // 'stripe' | 'polar' | null for manual/testing
	paymentCustomerId: text('paymentCustomerId'),
	paymentSubscriptionId: text('paymentSubscriptionId'),
	paymentPriceId: text('paymentPriceId'),

	currentPeriodStart: timestamp('currentPeriodStart'),
	currentPeriodEnd: timestamp('currentPeriodEnd'),

	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
});

export const spaceResourceAllocation = pgTable('spaceResourceAllocation', {
	id: text('id').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	organizationId: text('organizationId')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' }),

	// Percentage allocations (0-100, must sum to 100 across all user's spaces)
	storagePercentage: integer('storagePercentage').notNull().default(0),
	submissionPercentage: integer('submissionPercentage').notNull().default(0),

	// Lock status - locked allocations are preserved when spaces are added/removed
	storageIsLocked: boolean('storageIsLocked').notNull().default(false),
	submissionIsLocked: boolean('submissionIsLocked').notNull().default(false),

	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
});

export const spaceResourceUsage = pgTable('spaceResourceUsage', {
	id: text('id').primaryKey(),
	organizationId: text('organizationId')
		.notNull()
		.references(() => organization.id, { onDelete: 'cascade' })
		.unique(),

	// Current usage tracking
	usedStorageMb: integer('usedStorageMb').notNull().default(0),
	submissionsThisMonth: integer('submissionsThisMonth').notNull().default(0),
	totalSubmissions: integer('totalSubmissions').notNull().default(0),
	activeMembers: integer('activeMembers').notNull().default(1),
	activeForms: integer('activeForms').notNull().default(0),

	// NOTE: Monthly limits reset based on subscription.currentPeriodStart/End
	// Not calendar month - each user has their own billing cycle

	updatedAt: timestamp('updatedAt').notNull().defaultNow()
}, (table) => ({
	// CHECK constraints to prevent negative values (critical for atomic operations)
	storageCheck: check('storage_check', sql`${table.usedStorageMb} >= 0`),
	submissionsMonthCheck: check('submissions_month_check', sql`${table.submissionsThisMonth} >= 0`),
	submissionsTotalCheck: check('submissions_total_check', sql`${table.totalSubmissions} >= 0`),
	membersCheck: check('members_check', sql`${table.activeMembers} >= 0`),
	formsCheck: check('forms_check', sql`${table.activeForms} >= 0`),
}));

export const usageOverage = pgTable('usageOverage', {
	id: text('id').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),

	// Billing period
	billingMonth: text('billingMonth').notNull(), // Format: 'YYYY-MM'

	// Overage amounts
	submissionOverage: integer('submissionOverage').notNull().default(0), // count over limit
	storageOverageMb: integer('storageOverageMb').notNull().default(0), // MB over limit

	// Calculated charges (in cents)
	submissionCharge: integer('submissionCharge').notNull().default(0),
	storageCharge: integer('storageCharge').notNull().default(0),
	totalCharge: integer('totalCharge').notNull().default(0),

	// Payment provider integration (vendor-agnostic)
	paymentInvoiceId: text('paymentInvoiceId'),
	isPaid: boolean('isPaid').default(false),

	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
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
