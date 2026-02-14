package cleanup

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// StartSpamCleanupScheduler runs a background goroutine that periodically
// deletes spam submissions older than 30 days.
func StartSpamCleanupScheduler(pool *pgxpool.Pool) {
	// Run cleanup immediately on startup, then hourly
	go func() {
		// Initial cleanup on startup
		deleteOldSpam(pool)

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			deleteOldSpam(pool)
		}
	}()

	log.Info().Msg("Spam cleanup scheduler started (runs hourly, deletes spam > 30 days old)")
}

// deleteOldSpam removes spam submissions older than 30 days
func deleteOldSpam(pool *pgxpool.Pool) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := pool.Exec(ctx, `
		DELETE FROM submission
		WHERE is_spam = true
		AND created_at < NOW() - INTERVAL '30 days'
	`)

	if err != nil {
		log.Error().Err(err).Msg("Failed to delete old spam submissions")
		return
	}

	rowsDeleted := result.RowsAffected()
	if rowsDeleted > 0 {
		log.Info().Int64("deleted_count", rowsDeleted).Msg("Deleted old spam submissions")
	}
}
