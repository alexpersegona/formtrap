-- FormTrap Database Schema (for SQLC type generation)
-- Source of truth is Drizzle schema in ../src/lib/server/db/schema.ts
-- This file is used by SQLC for Go code generation only

-- Organizations (Spaces)
CREATE TABLE IF NOT EXISTS organization (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Forms
CREATE TABLE IF NOT EXISTS form (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    allow_file_uploads BOOLEAN NOT NULL DEFAULT false,
    max_file_count INTEGER DEFAULT 3,
    max_file_size INTEGER DEFAULT 10485760,
    allowed_file_types TEXT,
    spam_check_enabled BOOLEAN NOT NULL DEFAULT true,
    honeypot_field_name TEXT DEFAULT 'website',
    response_type TEXT NOT NULL DEFAULT 'json',
    redirect_url TEXT,
    success_message TEXT DEFAULT 'Thank you! Your submission has been received.',
    webhook_url TEXT,
    send_email_notifications BOOLEAN NOT NULL DEFAULT true,
    notification_emails TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Submissions
CREATE TABLE IF NOT EXISTS submission (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES form(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    data JSONB NOT NULL,
    files JSONB,
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    device TEXT,
    device_type TEXT,
    os TEXT,
    browser TEXT,
    is_robot BOOLEAN DEFAULT false,
    is_spam BOOLEAN DEFAULT false,
    spam_score INTEGER,
    spam_reason TEXT,
    webhook_sent BOOLEAN DEFAULT false,
    webhook_sent_at TIMESTAMP,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscription (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    max_spaces INTEGER NOT NULL DEFAULT 1,
    max_submissions_per_month INTEGER NOT NULL DEFAULT 100,
    max_storage_mb INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Space Resource Usage
CREATE TABLE IF NOT EXISTS space_resource_usage (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL UNIQUE REFERENCES organization(id) ON DELETE CASCADE,
    used_storage_mb INTEGER NOT NULL DEFAULT 0,
    submissions_this_month INTEGER NOT NULL DEFAULT 0,
    total_submissions INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT storage_check CHECK (used_storage_mb >= 0),
    CONSTRAINT submissions_month_check CHECK (submissions_this_month >= 0),
    CONSTRAINT submissions_total_check CHECK (total_submissions >= 0)
);

-- Members (for subscription lookup)
CREATE TABLE IF NOT EXISTS member (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_submissions_form_created ON submission(form_id, created_at);
CREATE INDEX IF NOT EXISTS idx_submissions_spam ON submission(is_spam) WHERE is_spam = true;
CREATE INDEX IF NOT EXISTS idx_submissions_form_spam ON submission(form_id, is_spam);
CREATE INDEX IF NOT EXISTS idx_forms_organization ON form(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_org_active ON form(organization_id, is_active);
