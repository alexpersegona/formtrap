// Package jobs provides a PostgreSQL-based job queue using River.
// All long-running operations (file deletion, retention cleanup) should be
// queued as jobs rather than executed synchronously.
package jobs

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"
	"github.com/rs/zerolog/log"
)

// QueueName constants for job priority
const (
	QueueCritical = "critical" // User-initiated deletions (10 workers)
	QueueDefault  = "default"  // Standard cleanup (5 workers)
	QueueLow      = "low"      // Scheduled retention, BYOI cleanup (2 workers)
)

// JobClient wraps River client for job queue operations
type JobClient struct {
	client *river.Client[pgx.Tx]
	pool   *pgxpool.Pool
}

// NewJobClient creates a new job queue client with all workers registered.
func NewJobClient(pool *pgxpool.Pool) (*JobClient, error) {
	// Run River migrations first
	if err := runMigrations(context.Background(), pool); err != nil {
		return nil, fmt.Errorf("failed to run river migrations: %w", err)
	}

	workers := river.NewWorkers()

	// Register all workers
	river.AddWorker(workers, &DeleteSubmissionFilesWorker{pool: pool})
	river.AddWorker(workers, &DeleteFormFilesWorker{pool: pool})
	river.AddWorker(workers, &RetentionCleanupWorker{pool: pool})
	river.AddWorker(workers, &OrphanScanWorker{pool: pool})

	riverClient, err := river.NewClient(riverpgxv5.New(pool), &river.Config{
		Queues: map[string]river.QueueConfig{
			QueueCritical: {MaxWorkers: 10}, // User-initiated deletions
			QueueDefault:  {MaxWorkers: 5},  // Standard cleanup
			QueueLow:      {MaxWorkers: 2},  // Scheduled retention
		},
		Workers: workers,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create river client: %w", err)
	}

	return &JobClient{
		client: riverClient,
		pool:   pool,
	}, nil
}

// runMigrations runs River's database migrations.
func runMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	migrator, err := rivermigrate.New(riverpgxv5.New(pool), nil)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}

	_, err = migrator.Migrate(ctx, rivermigrate.DirectionUp, nil)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Info().Msg("River migrations completed successfully")
	return nil
}

// Start begins processing jobs. Should be called once at server startup.
func (jc *JobClient) Start(ctx context.Context) error {
	log.Info().Msg("Starting job queue client")
	return jc.client.Start(ctx)
}

// Stop gracefully shuts down the job queue.
func (jc *JobClient) Stop(ctx context.Context) error {
	log.Info().Msg("Stopping job queue client")
	return jc.client.Stop(ctx)
}

// EnqueueDeleteSubmissionFiles queues deletion of files for a single submission.
// This should be called BEFORE deleting the submission record.
func (jc *JobClient) EnqueueDeleteSubmissionFiles(
	ctx context.Context,
	tx pgx.Tx,
	submissionID string,
	formID string,
	filePaths []string,
	provider string, // "platform" or "user"
	userID string,   // Required for user provider
) error {
	args := DeleteSubmissionFilesArgs{
		SubmissionID: submissionID,
		FormID:       formID,
		FilePaths:    filePaths,
		Provider:     provider,
		UserID:       userID,
	}

	_, err := jc.client.InsertTx(ctx, tx, args, &river.InsertOpts{
		Queue: QueueCritical,
	})
	if err != nil {
		return fmt.Errorf("failed to enqueue submission file deletion: %w", err)
	}

	log.Info().
		Str("submission_id", submissionID).
		Str("form_id", formID).
		Int("file_count", len(filePaths)).
		Msg("Queued submission file deletion")

	return nil
}

// EnqueueDeleteFormFiles queues deletion of ALL files for a form.
func (jc *JobClient) EnqueueDeleteFormFiles(
	ctx context.Context,
	tx pgx.Tx,
	formID string,
	provider string,
	userID string,
) error {
	args := DeleteFormFilesArgs{
		FormID:   formID,
		Provider: provider,
		UserID:   userID,
	}

	_, err := jc.client.InsertTx(ctx, tx, args, &river.InsertOpts{
		Queue: QueueCritical,
	})
	if err != nil {
		return fmt.Errorf("failed to enqueue form file deletion: %w", err)
	}

	log.Info().
		Str("form_id", formID).
		Msg("Queued form file deletion")

	return nil
}

// EnqueueRetentionCleanup queues a retention cleanup job.
// This is typically called by a scheduler.
func (jc *JobClient) EnqueueRetentionCleanup(ctx context.Context) error {
	args := RetentionCleanupArgs{
		RetentionDays: 14,
		BatchSize:     100,
	}

	_, err := jc.client.Insert(ctx, args, &river.InsertOpts{
		Queue:    QueueLow,
		UniqueOpts: river.UniqueOpts{
			ByPeriod: 1 * time.Hour, // Only one retention job per hour
		},
	})
	if err != nil {
		return fmt.Errorf("failed to enqueue retention cleanup: %w", err)
	}

	log.Info().Msg("Queued retention cleanup job")
	return nil
}

// EnqueueOrphanScan queues an orphan scan job.
// Set dryRun to true to only report orphans without deleting.
func (jc *JobClient) EnqueueOrphanScan(ctx context.Context, minAgeMinutes int, dryRun bool) (int64, error) {
	if minAgeMinutes <= 0 {
		minAgeMinutes = 60 // Default 1 hour
	}

	args := OrphanScanArgs{
		MinAgeMinutes: minAgeMinutes,
		DryRun:        dryRun,
	}

	result, err := jc.client.Insert(ctx, args, &river.InsertOpts{
		Queue: QueueLow,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to enqueue orphan scan: %w", err)
	}

	log.Info().
		Int64("job_id", result.Job.ID).
		Int("min_age_minutes", minAgeMinutes).
		Bool("dry_run", dryRun).
		Msg("Queued orphan scan job")

	return result.Job.ID, nil
}

// GetClient returns the underlying River client for advanced operations.
func (jc *JobClient) GetClient() *river.Client[pgx.Tx] {
	return jc.client
}

// GetPool returns the database pool.
func (jc *JobClient) GetPool() *pgxpool.Pool {
	return jc.pool
}
