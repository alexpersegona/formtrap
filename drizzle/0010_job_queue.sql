-- Job Queue System - Job Metrics Table
-- This table tracks job execution metrics for monitoring and debugging

CREATE TABLE IF NOT EXISTS job_metrics (
    id SERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    provider VARCHAR(50),
    user_id VARCHAR(100),
    batch_size INT,
    items_processed INT,
    duration_ms INT,
    status VARCHAR(20) NOT NULL DEFAULT 'success', -- 'success', 'partial', 'failed', 'rate_limited'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_metrics_created_at ON job_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_job_metrics_status ON job_metrics(status);
CREATE INDEX IF NOT EXISTS idx_job_metrics_job_type ON job_metrics(job_type);
CREATE INDEX IF NOT EXISTS idx_job_metrics_job_id ON job_metrics(job_id);

-- Note: River's internal tables are created by River's migration system,
-- which is run by the Go API at startup. Those tables include:
-- - river_job (pending/running/completed jobs)
-- - river_leader (leader election for periodic jobs)
-- - river_queue (queue configuration)
-- - river_client (client registration)
