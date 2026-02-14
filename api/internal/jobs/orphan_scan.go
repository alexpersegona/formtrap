package jobs

import (
	"context"
	"fmt"
	"regexp"
	"time"

	"api/internal/storage"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/rs/zerolog/log"
)

// OrphanScanArgs contains parameters for the orphan scan job.
type OrphanScanArgs struct {
	// MinAgeMinutes is the minimum age in minutes for a file to be considered orphaned.
	// Files newer than this are skipped (they might be in-flight uploads).
	MinAgeMinutes int `json:"min_age_minutes"`
	// DryRun if true, only reports orphans without deleting.
	DryRun bool `json:"dry_run"`
}

func (OrphanScanArgs) Kind() string { return "orphan_scan" }

// OrphanScanWorker scans storage for orphaned files (files with no matching DB record).
type OrphanScanWorker struct {
	river.WorkerDefaults[OrphanScanArgs]
	pool *pgxpool.Pool
}

// OrphanedFile represents a file found in storage with no DB record.
type OrphanedFile struct {
	Key          string
	Size         int64
	LastModified time.Time
	FormID       string
	SubmissionID string
}

func (w *OrphanScanWorker) Work(ctx context.Context, job *river.Job[OrphanScanArgs]) error {
	args := job.Args
	startTime := time.Now()

	minAgeMinutes := args.MinAgeMinutes
	if minAgeMinutes <= 0 {
		minAgeMinutes = 60 // Default 1 hour
	}

	cutoffTime := time.Now().Add(-time.Duration(minAgeMinutes) * time.Minute)

	log.Info().
		Int("min_age_minutes", minAgeMinutes).
		Bool("dry_run", args.DryRun).
		Time("cutoff_time", cutoffTime).
		Msg("Starting orphan scan")

	storageClient, err := storage.GetStorageClient("")
	if err != nil {
		return fmt.Errorf("failed to get storage client: %w", err)
	}

	// Pattern to extract form ID and submission ID from path
	// Path format: submissions/{formId}/{submissionId}/{filename}
	pathPattern := regexp.MustCompile(`^submissions/([^/]+)/([^/]+)/`)

	var orphans []OrphanedFile
	var scannedCount int
	var continuationToken *string

	// Scan all files in submissions/ prefix
	for {
		result := storageClient.ListObjects(ctx, "submissions/", 1000, continuationToken)
		if result.Error != nil {
			return fmt.Errorf("failed to list objects: %w", result.Error)
		}

		for _, obj := range result.Objects {
			scannedCount++

			// Skip files newer than cutoff
			lastModified := time.Unix(obj.LastModified, 0)
			if lastModified.After(cutoffTime) {
				continue
			}

			// Extract form ID and submission ID from path
			matches := pathPattern.FindStringSubmatch(obj.Key)
			if len(matches) < 3 {
				log.Warn().Str("key", obj.Key).Msg("Could not parse path")
				continue
			}

			formID := matches[1]
			submissionID := matches[2]

			// Check if submission exists in DB
			var exists bool
			err := w.pool.QueryRow(ctx, `
				SELECT EXISTS(SELECT 1 FROM submission WHERE id = $1 AND deleted_at IS NULL)
			`, submissionID).Scan(&exists)

			if err != nil {
				log.Warn().Err(err).Str("submission_id", submissionID).Msg("Failed to check submission existence")
				continue
			}

			if !exists {
				orphans = append(orphans, OrphanedFile{
					Key:          obj.Key,
					Size:         obj.Size,
					LastModified: lastModified,
					FormID:       formID,
					SubmissionID: submissionID,
				})
			}
		}

		if !result.IsTruncated {
			break
		}
		continuationToken = result.ContinuationToken
	}

	duration := time.Since(startTime)

	log.Info().
		Int("scanned", scannedCount).
		Int("orphans_found", len(orphans)).
		Dur("duration", duration).
		Msg("Orphan scan completed")

	// Store results in database
	var totalSize int64
	for _, o := range orphans {
		totalSize += o.Size
	}

	_, err = w.pool.Exec(ctx, `
		INSERT INTO orphan_scan_result (
			job_id, scanned_count, orphan_count, total_orphan_size_bytes,
			dry_run, duration_ms, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, job.ID, scannedCount, len(orphans), totalSize, args.DryRun, duration.Milliseconds(), "completed")

	if err != nil {
		log.Warn().Err(err).Msg("Failed to store orphan scan result")
	}

	// Store individual orphan records
	for _, orphan := range orphans {
		_, err = w.pool.Exec(ctx, `
			INSERT INTO orphan_file (
				scan_job_id, file_key, file_size, last_modified,
				form_id, submission_id
			) VALUES ($1, $2, $3, $4, $5, $6)
		`, job.ID, orphan.Key, orphan.Size, orphan.LastModified, orphan.FormID, orphan.SubmissionID)

		if err != nil {
			log.Warn().Err(err).Str("key", orphan.Key).Msg("Failed to store orphan file record")
		}
	}

	// If not dry run and there are orphans, delete them
	if !args.DryRun && len(orphans) > 0 {
		log.Info().Int("count", len(orphans)).Msg("Deleting orphaned files")

		deleted := 0
		for _, orphan := range orphans {
			if err := storageClient.DeleteFile(ctx, orphan.Key); err != nil {
				log.Warn().Err(err).Str("key", orphan.Key).Msg("Failed to delete orphan file")
			} else {
				deleted++
			}
		}

		// Update the scan result with deletion count
		_, err = w.pool.Exec(ctx, `
			UPDATE orphan_scan_result
			SET deleted_count = $1, status = 'deleted'
			WHERE job_id = $2
		`, deleted, job.ID)

		if err != nil {
			log.Warn().Err(err).Msg("Failed to update orphan scan result")
		}

		log.Info().Int("deleted", deleted).Msg("Orphan deletion completed")
	}

	return nil
}
