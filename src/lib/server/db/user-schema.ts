/**
 * User Database Schema
 *
 * Drizzle schema for the user's own Postgres database.
 * Contains form and submission tables that live in the user's infrastructure.
 *
 * Note: organizationId and createdBy are plain text (no FK constraints)
 * because these reference entities in FormTrap's main DB (different database).
 */

import { pgTable, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const form = pgTable('form', {
	id: text('id').primaryKey(),
	organizationId: text('organizationId').notNull(),
	name: text('name').notNull(),
	description: text('description'),

	// Form configuration
	isActive: boolean('isActive').notNull().default(true),
	allowFileUploads: boolean('allowFileUploads').notNull().default(false),
	maxFileCount: integer('maxFileCount').default(3),
	maxFileSize: integer('maxFileSize').default(2097152), // 2MB default
	allowedFileTypes: text('allowedFileTypes'), // JSON array as string

	// Spam protection
	spamCheckEnabled: boolean('spamCheckEnabled').notNull().default(true),
	honeypotFieldName: text('honeypotFieldName').default('website'),

	// Response configuration
	responseType: text('responseType').notNull().default('json'), // 'redirect' | 'json'
	redirectUrl: text('redirectUrl'),
	successMessage: text('successMessage').default('Thank you! Your submission has been received.'),

	// Webhooks & notifications
	webhookUrl: text('webhookUrl'),
	sendEmailNotifications: boolean('sendEmailNotifications').notNull().default(true),
	notificationEmails: text('notificationEmails'), // JSON array as string

	createdBy: text('createdBy').notNull(),
	createdAt: timestamp('createdAt').notNull().defaultNow(),
	updatedAt: timestamp('updatedAt').notNull().defaultNow()
}, (table) => ({
	orgIdx: index('idx_forms_organization').on(table.organizationId),
	orgActiveIdx: index('idx_forms_org_active').on(table.organizationId, table.isActive),
}));

export const submission = pgTable('submission', {
	id: text('id').primaryKey(),
	formId: text('formId')
		.notNull()
		.references(() => form.id, { onDelete: 'cascade' }),

	// Extracted contact info
	email: text('email'),
	name: text('name'),

	// Submission status
	status: text('status').notNull().default('new'), // 'new', 'read', 'resolved'
	isRead: boolean('isRead').notNull().default(false),
	isClosed: boolean('isClosed').notNull().default(false),
	isArchived: boolean('isArchived').notNull().default(false),

	// Submission data
	data: jsonb('data').notNull(),
	files: jsonb('files'), // [{id, name, path, size, mime_type, uploaded_at}]

	// Associations
	associationId: text('associationId'),

	// Request metadata
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	referer: text('referer'),
	device: text('device'),
	deviceType: text('deviceType'),
	os: text('os'),
	browser: text('browser'),
	isRobot: boolean('isRobot').default(false),

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
	deletedAt: timestamp('deletedAt')
}, (table) => ({
	formCreatedIdx: index('idx_submissions_form_created').on(table.formId, table.createdAt),
	spamIdx: index('idx_submissions_spam').on(table.isSpam).where(sql`${table.isSpam} = true`),
	formSpamIdx: index('idx_submissions_form_spam').on(table.formId, table.isSpam),
}));

export const formRelations = relations(form, ({ many }) => ({
	submissions: many(submission)
}));

export const submissionRelations = relations(submission, ({ one }) => ({
	form: one(form, {
		fields: [submission.formId],
		references: [form.id]
	})
}));
