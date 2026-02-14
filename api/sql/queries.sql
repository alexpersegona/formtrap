-- name: GetFormSubmissionContext :one
-- Get all context needed for form submission validation in ONE query
SELECT
    -- Form data
    f.id as form_id,
    f.name as form_name,
    f.is_active as form_is_active,
    f.allow_file_uploads,
    f.max_file_count,
    f.max_file_size,
    f.allowed_file_types,
    f.spam_check_enabled,
    f.honeypot_field_name,
    f.webhook_url,
    f.send_email_notifications,
    f.notification_emails,
    f.response_type,
    f.redirect_url,
    f.success_message,

    -- Organization data
    o.id as organization_id,
    o.name as organization_name,
    o.is_paused as organization_is_paused,

    -- Resource usage
    COALESCE(ru.used_storage_mb, 0) as used_storage_mb,
    COALESCE(ru.submissions_this_month, 0) as submissions_this_month,
    COALESCE(ru.total_submissions, 0) as total_submissions,

    -- Subscription limits
    s.max_submissions_per_month,
    s.max_storage_mb,
    s.status as subscription_status

FROM form f
INNER JOIN organization o ON f.organization_id = o.id
LEFT JOIN space_resource_usage ru ON ru.organization_id = o.id
INNER JOIN member m ON m.organization_id = o.id
INNER JOIN subscription s ON s.user_id = m.user_id
WHERE f.id = $1
LIMIT 1;

-- name: CreateSubmission :one
-- Create a new form submission
INSERT INTO submission (
    id, form_id, email, name, status, is_read, is_closed,
    data, files, ip_address, user_agent, referer,
    device, device_type, os, browser, is_robot,
    is_spam, spam_reason, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
)
RETURNING *;

-- name: IncrementSubmissionCounters :exec
-- Atomically increment submission counters (NON-SPAM submissions only)
UPDATE space_resource_usage
SET
    submissions_this_month = submissions_this_month + 1,
    total_submissions = total_submissions + 1,
    updated_at = NOW()
WHERE organization_id = $1;

-- name: IncrementStorageUsage :exec
-- Atomically increment storage usage
UPDATE space_resource_usage
SET
    used_storage_mb = used_storage_mb + $2,
    updated_at = NOW()
WHERE organization_id = $1;

-- name: UpdateSubmissionFiles :exec
-- Update submission with uploaded file metadata
UPDATE submission
SET
    files = $2,
    updated_at = NOW()
WHERE id = $1;

-- name: MarkWebhookSent :exec
-- Mark webhook as sent
UPDATE submission
SET
    webhook_sent = true,
    webhook_sent_at = NOW()
WHERE id = $1;

-- name: MarkEmailSent :exec
-- Mark email notification as sent
UPDATE submission
SET
    email_sent = true,
    email_sent_at = NOW()
WHERE id = $1;
