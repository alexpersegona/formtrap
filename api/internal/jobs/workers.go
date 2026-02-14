package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"api/internal/storage"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/rs/zerolog/log"
)

// DeleteSubmissionFilesArgs contains parameters for deleting a submission's files.
type DeleteSubmissionFilesArgs struct {
	SubmissionID string   `json:"submission_id"`
	FormID       string   `json:"form_id"`
	FilePaths    []string `json:"file_paths"`
	Provider     string   `json:"provider"` // "platform" or "user"
	UserID       string   `json:"user_id,omitempty"`
}

func (DeleteSubmissionFilesArgs) Kind() string { return "delete_submission_files" }

// DeleteSubmissionFilesWorker processes file deletion for individual submissions.
type DeleteSubmissionFilesWorker struct {
	river.WorkerDefaults[DeleteSubmissionFilesArgs]
	pool *pgxpool.Pool
}

func (w *DeleteSubmissionFilesWorker) Work(ctx context.Context, job *river.Job[DeleteSubmissionFilesArgs]) error {
	args := job.Args
	startTime := time.Now()

	log.Info().
		Str("submission_id", args.SubmissionID).
		Str("form_id", args.FormID).
		Int("file_count", len(args.FilePaths)).
		Str("provider", args.Provider).
		Msg("Processing submission file deletion")

	var storageClient *storage.StorageClient
	var err error

	if args.Provider == "user" && args.UserID != "" {
		// Get user's storage client
		storageClient, err = storage.GetUserStorageClient(ctx, w.pool, args.UserID)
		if err != nil {
			log.Warn().Err(err).
				Str("user_id", args.UserID).
				Msg("Failed to get user storage client, attempting platform storage")
			// Fall back to platform storage
			storageClient, err = storage.GetStorageClient("")
			if err != nil {
				return fmt.Errorf("failed to get storage client: %w", err)
			}
		}
	} else {
		storageClient, err = storage.GetStorageClient("")
		if err != nil {
			return fmt.Errorf("failed to get storage client: %w", err)
		}
	}

	// Delete the files
	result := storageClient.DeleteSubmissionFilesWithResult(ctx, args.FormID, args.SubmissionID)

	// Record metrics
	duration := time.Since(startTime)
	w.recordMetrics(ctx, job.ID, args, result, duration)

	if result.Error != nil {
		// If partial success, log warning but don't fail the job
		if result.ItemsDeleted > 0 {
			log.Warn().
				Err(result.Error).
				Int("deleted", result.ItemsDeleted).
				Int("failed", result.ItemsFailed).
				Msg("Partial file deletion success")
			return nil
		}
		return result.Error
	}

	log.Info().
		Str("submission_id", args.SubmissionID).
		Int("deleted", result.ItemsDeleted).
		Dur("duration", duration).
		Msg("Submission files deleted successfully")

	return nil
}

func (w *DeleteSubmissionFilesWorker) recordMetrics(
	ctx context.Context,
	jobID int64,
	args DeleteSubmissionFilesArgs,
	result *storage.DeleteResult,
	duration time.Duration,
) {
	status := "success"
	var errMsg *string

	if result.Error != nil {
		if result.ItemsDeleted > 0 {
			status = "partial"
		} else {
			status = "failed"
		}
		msg := result.Error.Error()
		errMsg = &msg
	}

	_, err := w.pool.Exec(ctx, `
		INSERT INTO job_metrics (job_id, job_type, provider, user_id, batch_size, items_processed, duration_ms, status, error_message)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, jobID, "delete_submission_files", args.Provider, args.UserID, len(args.FilePaths), result.ItemsDeleted, duration.Milliseconds(), status, errMsg)

	if err != nil {
		log.Warn().Err(err).Msg("Failed to record job metrics")
	}
}

// DeleteFormFilesArgs contains parameters for deleting all files for a form.
type DeleteFormFilesArgs struct {
	FormID   string `json:"form_id"`
	Provider string `json:"provider"`
	UserID   string `json:"user_id,omitempty"`
}

func (DeleteFormFilesArgs) Kind() string { return "delete_form_files" }

// DeleteFormFilesWorker processes file deletion for entire forms.
type DeleteFormFilesWorker struct {
	river.WorkerDefaults[DeleteFormFilesArgs]
	pool *pgxpool.Pool
}

func (w *DeleteFormFilesWorker) Work(ctx context.Context, job *river.Job[DeleteFormFilesArgs]) error {
	args := job.Args
	startTime := time.Now()

	log.Info().
		Str("form_id", args.FormID).
		Str("provider", args.Provider).
		Msg("Processing form file deletion")

	var storageClient *storage.StorageClient
	var err error

	if args.Provider == "user" && args.UserID != "" {
		storageClient, err = storage.GetUserStorageClient(ctx, w.pool, args.UserID)
		if err != nil {
			log.Warn().Err(err).Str("user_id", args.UserID).Msg("Failed to get user storage client")
			storageClient, err = storage.GetStorageClient("")
			if err != nil {
				return fmt.Errorf("failed to get storage client: %w", err)
			}
		}
	} else {
		storageClient, err = storage.GetStorageClient("")
		if err != nil {
			return fmt.Errorf("failed to get storage client: %w", err)
		}
	}

	// Delete all files for the form
	result := storageClient.DeleteFormFiles(ctx, args.FormID)

	duration := time.Since(startTime)
	w.recordMetrics(ctx, job.ID, args, result, duration)

	if result.Error != nil && result.ItemsDeleted == 0 {
		return result.Error
	}

	log.Info().
		Str("form_id", args.FormID).
		Int("deleted", result.ItemsDeleted).
		Dur("duration", duration).
		Msg("Form files deleted successfully")

	return nil
}

func (w *DeleteFormFilesWorker) recordMetrics(
	ctx context.Context,
	jobID int64,
	args DeleteFormFilesArgs,
	result *storage.DeleteResult,
	duration time.Duration,
) {
	status := "success"
	var errMsg *string

	if result.Error != nil {
		if result.ItemsDeleted > 0 {
			status = "partial"
		} else {
			status = "failed"
		}
		msg := result.Error.Error()
		errMsg = &msg
	}

	_, err := w.pool.Exec(ctx, `
		INSERT INTO job_metrics (job_id, job_type, provider, user_id, items_processed, duration_ms, status, error_message)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, jobID, "delete_form_files", args.Provider, args.UserID, result.ItemsDeleted, duration.Milliseconds(), status, errMsg)

	if err != nil {
		log.Warn().Err(err).Msg("Failed to record job metrics")
	}
}

// RetentionCleanupArgs contains parameters for retention-based cleanup.
type RetentionCleanupArgs struct {
	RetentionDays int `json:"retention_days"`
	BatchSize     int `json:"batch_size"`
}

func (RetentionCleanupArgs) Kind() string { return "retention_cleanup" }

// RetentionCleanupWorker processes retention-based submission cleanup.
type RetentionCleanupWorker struct {
	river.WorkerDefaults[RetentionCleanupArgs]
	pool *pgxpool.Pool
}

func (w *RetentionCleanupWorker) Work(ctx context.Context, job *river.Job[RetentionCleanupArgs]) error {
	args := job.Args
	startTime := time.Now()

	log.Info().
		Int("retention_days", args.RetentionDays).
		Int("batch_size", args.BatchSize).
		Msg("Starting retention cleanup")

	// Query for expired submissions from free trial users
	// Free trial = no subscription OR subscription status != 'active'
	rows, err := w.pool.Query(ctx, `
		SELECT s.id, s.form_id, s.files
		FROM submission s
		INNER JOIN form f ON s.form_id = f.id
		INNER JOIN organization o ON f.organization_id = o.id
		LEFT JOIN subscription sub ON o.created_by = sub.user_id AND sub.status = 'active' AND sub.tier = 'pro'
		WHERE sub.id IS NULL
		  AND s.created_at < NOW() - ($1 || ' days')::INTERVAL
		  AND s.deleted_at IS NULL
		LIMIT $2
	`, args.RetentionDays, args.BatchSize)
	if err != nil {
		return fmt.Errorf("failed to query expired submissions: %w", err)
	}
	defer rows.Close()

	var toDelete []struct {
		ID     string
		FormID string
		Files  json.RawMessage
	}

	for rows.Next() {
		var sub struct {
			ID     string
			FormID string
			Files  json.RawMessage
		}
		if err := rows.Scan(&sub.ID, &sub.FormID, &sub.Files); err != nil {
			log.Warn().Err(err).Msg("Failed to scan submission row")
			continue
		}
		toDelete = append(toDelete, sub)
	}

	if len(toDelete) == 0 {
		log.Info().Msg("No expired submissions found for retention cleanup")
		return nil
	}

	log.Info().Int("count", len(toDelete)).Msg("Found expired submissions for cleanup")

	storageClient, err := storage.GetStorageClient("")
	if err != nil {
		return fmt.Errorf("failed to get storage client: %w", err)
	}

	deleted := 0
	for _, sub := range toDelete {
		// Delete files first
		if len(sub.Files) > 0 {
			result := storageClient.DeleteSubmissionFilesWithResult(ctx, sub.FormID, sub.ID)
			if result.Error != nil {
				log.Warn().Err(result.Error).Str("submission_id", sub.ID).Msg("Failed to delete submission files")
				// Continue anyway - we'll mark as deleted and handle orphans later
			}
		}

		// Soft delete the submission
		_, err := w.pool.Exec(ctx, `
			UPDATE submission SET deleted_at = NOW() WHERE id = $1
		`, sub.ID)
		if err != nil {
			log.Warn().Err(err).Str("submission_id", sub.ID).Msg("Failed to soft delete submission")
			continue
		}

		deleted++
	}

	duration := time.Since(startTime)

	// Record metrics
	_, err = w.pool.Exec(ctx, `
		INSERT INTO job_metrics (job_id, job_type, provider, batch_size, items_processed, duration_ms, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, job.ID, "retention_cleanup", "platform", args.BatchSize, deleted, duration.Milliseconds(), "success")

	if err != nil {
		log.Warn().Err(err).Msg("Failed to record job metrics")
	}

	log.Info().
		Int("deleted", deleted).
		Dur("duration", duration).
		Msg("Retention cleanup completed")

	return nil
}
