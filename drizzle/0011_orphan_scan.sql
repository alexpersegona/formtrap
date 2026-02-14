-- Orphan scan results table
CREATE TABLE IF NOT EXISTS "orphan_scan_result" (
    "id" serial PRIMARY KEY NOT NULL,
    "job_id" bigint NOT NULL,
    "scanned_count" integer NOT NULL DEFAULT 0,
    "orphan_count" integer NOT NULL DEFAULT 0,
    "deleted_count" integer DEFAULT 0,
    "total_orphan_size_bytes" bigint NOT NULL DEFAULT 0,
    "dry_run" boolean NOT NULL DEFAULT true,
    "duration_ms" integer NOT NULL DEFAULT 0,
    "status" varchar(20) NOT NULL DEFAULT 'running',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Individual orphan files found during scan
CREATE TABLE IF NOT EXISTS "orphan_file" (
    "id" serial PRIMARY KEY NOT NULL,
    "scan_job_id" bigint NOT NULL,
    "file_key" text NOT NULL,
    "file_size" bigint NOT NULL DEFAULT 0,
    "last_modified" timestamp with time zone,
    "form_id" varchar(36),
    "submission_id" varchar(36),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_orphan_scan_result_created_at" ON "orphan_scan_result" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_orphan_file_scan_job_id" ON "orphan_file" ("scan_job_id");
