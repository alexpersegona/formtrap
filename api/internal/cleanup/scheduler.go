package cleanup

import (
	"context"
	"encoding/json"
	"time"

	"api/internal/storage"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// StartSpamCleanupScheduler runs a background goroutine that periodically
// deletes spam submissions older than 30 days.
// Note: This now includes file cleanup before deleting DB records.
func StartSpamCleanupScheduler(pool *pgxpool.Pool) {
	// Run cleanup immediately on startup, then hourly
	go func() {
		// Initial cleanup on startup (with 30 second delay to let services initialize)
		time.Sleep(30 * time.Second)
		deleteOldSpam(pool)

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			deleteOldSpam(pool)
		}
	}()

	log.Info().Msg("Spam cleanup scheduler started (runs hourly, deletes spam > 30 days old)")
}

// deleteOldSpam removes spam submissions older than 30 days.
// It first deletes associated files, then the database records.
func deleteOldSpam(pool *pgxpool.Pool) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// First, get submissions that need cleanup (with their files)
	rows, err := pool.Query(ctx, `
		SELECT id, form_id, files
		FROM submission
		WHERE is_spam = true
		AND created_at < NOW() - INTERVAL '30 days'
		LIMIT 100
	`)
	if err != nil {
		log.Error().Err(err).Msg("Failed to query old spam submissions")
		return
	}
	defer rows.Close()

	type spamSubmission struct {
		ID     string
		FormID string
		Files  json.RawMessage
	}

	var submissions []spamSubmission
	for rows.Next() {
		var sub spamSubmission
		if err := rows.Scan(&sub.ID, &sub.FormID, &sub.Files); err != nil {
			log.Warn().Err(err).Msg("Failed to scan spam submission")
			continue
		}
		submissions = append(submissions, sub)
	}

	if len(submissions) == 0 {
		return
	}

	log.Info().Int("count", len(submissions)).Msg("Found old spam submissions to clean up")

	// Get storage client for file cleanup
	storageClient, err := storage.GetStorageClient("")
	if err != nil {
		log.Warn().Err(err).Msg("Failed to get storage client, proceeding without file cleanup")
		storageClient = nil
	}

	deleted := 0
	for _, sub := range submissions {
		// Delete files first (if storage client available and files exist)
		if storageClient != nil && len(sub.Files) > 0 && string(sub.Files) != "null" {
			result := storageClient.DeleteSubmissionFilesWithResult(ctx, sub.FormID, sub.ID)
			if result.Error != nil {
				log.Warn().
					Err(result.Error).
					Str("submission_id", sub.ID).
					Msg("Failed to delete spam submission files, proceeding with DB cleanup")
			} else if result.ItemsDeleted > 0 {
				log.Debug().
					Str("submission_id", sub.ID).
					Int("files_deleted", result.ItemsDeleted).
					Msg("Deleted spam submission files")
			}
		}

		// Delete DB record
		_, err := pool.Exec(ctx, `DELETE FROM submission WHERE id = $1`, sub.ID)
		if err != nil {
			log.Warn().Err(err).Str("submission_id", sub.ID).Msg("Failed to delete spam submission")
			continue
		}
		deleted++
	}

	if deleted > 0 {
		log.Info().Int("deleted_count", deleted).Msg("Deleted old spam submissions with file cleanup")
	}
}
