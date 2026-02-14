import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

interface QueueStat {
	queue: string;
	state: string;
	count: number;
}

interface RecentJob {
	id: number;
	kind: string;
	queue: string;
	state: string;
	created_at: Date;
	finalized_at: Date | null;
	errors: unknown[];
	args: Record<string, unknown>;
}

interface JobMetric {
	id: number;
	job_id: number;
	job_type: string;
	provider: string | null;
	user_id: string | null;
	batch_size: number | null;
	items_processed: number | null;
	duration_ms: number | null;
	status: string;
	error_message: string | null;
	created_at: Date;
}

interface OrphanScanResult {
	id: number;
	job_id: number;
	scanned_count: number;
	orphan_count: number;
	deleted_count: number | null;
	total_orphan_size_bytes: number;
	dry_run: boolean;
	duration_ms: number;
	status: string;
	created_at: Date;
}

export const load: PageServerLoad = async ({ url }) => {
	const filter = url.searchParams.get('filter') || 'all';
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50'), 10), 50);
	const offset = (page - 1) * limit;

	// Check if River tables exist
	let riverTablesExist = true;
	try {
		await db.execute(sql`SELECT 1 FROM river_job LIMIT 1`);
	} catch {
		riverTablesExist = false;
	}

	// Check if job_metrics table exists
	let metricsTableExists = true;
	try {
		await db.execute(sql`SELECT 1 FROM job_metrics LIMIT 1`);
	} catch {
		metricsTableExists = false;
	}

	if (!riverTablesExist) {
		return {
			riverTablesExist: false,
			metricsTableExists,
			orphanScanTableExists: false,
			queueStats: [],
			recentJobs: [],
			metrics: { total: 0, avgDuration: 0, failureRate: 0 },
			orphanScanResults: [],
			providerConfig: getProviderConfig(),
			filter,
			page,
			limit,
			totalPages: 1
		};
	}

	// Queue stats by state
	const queueStatsResult = await db.execute(sql`
		SELECT queue, state, COUNT(*)::int as count
		FROM river_job
		GROUP BY queue, state
		ORDER BY queue, state
	`);
	const queueStats = queueStatsResult as unknown as QueueStat[];

	// Build filter condition
	let stateCondition = sql`1=1`;
	if (filter === 'pending') {
		stateCondition = sql`state = 'available'`;
	} else if (filter === 'running') {
		stateCondition = sql`state = 'running'`;
	} else if (filter === 'completed') {
		stateCondition = sql`state = 'completed'`;
	} else if (filter === 'failed') {
		stateCondition = sql`state IN ('retryable', 'discarded', 'cancelled')`;
	}

	// Recent jobs with filter
	const recentJobsResult = await db.execute(sql`
		SELECT
			id,
			kind,
			queue,
			state,
			created_at,
			finalized_at,
			errors,
			args
		FROM river_job
		WHERE ${stateCondition}
		ORDER BY created_at DESC
		LIMIT ${limit} OFFSET ${offset}
	`);
	const recentJobs = recentJobsResult as unknown as RecentJob[];

	// Total count for pagination
	const countResult = await db.execute(sql`
		SELECT COUNT(*)::int as count FROM river_job WHERE ${stateCondition}
	`);
	const totalCount = (countResult as unknown as { count: number }[])[0]?.count || 0;
	const totalPages = Math.ceil(totalCount / limit);

	// Metrics from last 24 hours (if table exists)
	let metrics = { total: 0, avgDuration: 0, failureRate: 0 };
	if (metricsTableExists) {
		const metricsResult = await db.execute(sql`
			SELECT
				COUNT(*)::int as total,
				COALESCE(AVG(duration_ms), 0)::int as avg_duration,
				COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0), 0) as failure_rate
			FROM job_metrics
			WHERE created_at > NOW() - INTERVAL '24 hours'
		`);
		const row = (metricsResult as unknown as { total: number; avg_duration: number; failure_rate: number }[])[0];
		if (row) {
			metrics = {
				total: row.total,
				avgDuration: row.avg_duration,
				failureRate: row.failure_rate * 100
			};
		}
	}

	// Check if orphan scan tables exist and load results
	let orphanScanTableExists = true;
	let orphanScanResults: OrphanScanResult[] = [];
	try {
		const scanResults = await db.execute(sql`
			SELECT id, job_id, scanned_count, orphan_count, deleted_count,
			       total_orphan_size_bytes, dry_run, duration_ms, status, created_at
			FROM orphan_scan_result
			ORDER BY created_at DESC
			LIMIT 10
		`);
		orphanScanResults = scanResults as unknown as OrphanScanResult[];
	} catch {
		orphanScanTableExists = false;
	}

	return {
		riverTablesExist: true,
		metricsTableExists,
		orphanScanTableExists,
		queueStats,
		recentJobs: recentJobs.map((job) => ({
			...job,
			created_at: job.created_at instanceof Date ? job.created_at.toISOString() : String(job.created_at),
			finalized_at: job.finalized_at ? (job.finalized_at instanceof Date ? job.finalized_at.toISOString() : String(job.finalized_at)) : null
		})),
		metrics,
		orphanScanResults: orphanScanResults.map((r) => ({
			...r,
			created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
		})),
		providerConfig: getProviderConfig(),
		filter,
		page,
		limit,
		totalPages
	};
};

function getProviderConfig() {
	return {
		r2: 1000,
		s3: 1000,
		backblaze: 100,
		gcs: 100
	};
}

export const actions = {
	retry: async ({ request }) => {
		const data = await request.formData();
		const jobId = data.get('jobId');

		if (!jobId || typeof jobId !== 'string') {
			return fail(400, { error: 'Job ID is required' });
		}

		try {
			// River doesn't have a direct retry mechanism via SQL
			// We need to update the job state to make it retryable
			await db.execute(sql`
				UPDATE river_job
				SET
					state = 'available',
					attempt = 0,
					scheduled_at = NOW(),
					errors = NULL
				WHERE id = ${parseInt(jobId)}
				AND state IN ('retryable', 'discarded', 'cancelled')
			`);

			return { success: true, message: 'Job queued for retry' };
		} catch (error) {
			console.error('Failed to retry job:', error);
			return fail(500, { error: 'Failed to retry job' });
		}
	},

	cancel: async ({ request }) => {
		const data = await request.formData();
		const jobId = data.get('jobId');

		if (!jobId || typeof jobId !== 'string') {
			return fail(400, { error: 'Job ID is required' });
		}

		try {
			await db.execute(sql`
				UPDATE river_job
				SET
					state = 'cancelled',
					finalized_at = NOW()
				WHERE id = ${parseInt(jobId)}
				AND state IN ('available', 'scheduled')
			`);

			return { success: true, message: 'Job cancelled' };
		} catch (error) {
			console.error('Failed to cancel job:', error);
			return fail(500, { error: 'Failed to cancel job' });
		}
	},

	triggerOrphanScan: async ({ request }) => {
		const data = await request.formData();
		const dryRun = data.get('dryRun') === 'true';
		const minAgeMinutes = parseInt(data.get('minAgeMinutes')?.toString() || '60');

		const apiUrl = env.GO_API_URL || 'http://localhost:8080';
		const adminApiKey = env.ADMIN_API_KEY;

		if (!adminApiKey) {
			return fail(500, { error: 'Admin API key not configured' });
		}

		try {
			const response = await fetch(`${apiUrl}/api/admin/jobs/orphan-scan`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${adminApiKey}`
				},
				body: JSON.stringify({
					min_age_minutes: minAgeMinutes,
					dry_run: dryRun
				})
			});

			if (!response.ok) {
				const error = await response.text();
				console.error('Failed to trigger orphan scan:', error);
				return fail(response.status, { error: 'Failed to trigger orphan scan' });
			}

			const result = await response.json();
			return { success: true, message: 'Orphan scan started', jobId: result.job_id };
		} catch (error) {
			console.error('Failed to trigger orphan scan:', error);
			return fail(500, { error: 'Failed to connect to API server' });
		}
	}
} satisfies Actions;
