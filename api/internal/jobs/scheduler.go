package jobs

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"
)

// StartScheduler runs periodic job scheduling.
// This should be called after the job client is started.
func StartScheduler(ctx context.Context, jc *JobClient) {
	go func() {
		// Schedule retention cleanup daily at 3 AM
		scheduleDaily(ctx, jc, 3, 0, func() {
			if err := jc.EnqueueRetentionCleanup(ctx); err != nil {
				log.Error().Err(err).Msg("Failed to schedule retention cleanup")
			}
		})
	}()

	log.Info().Msg("Job scheduler started")
}

// scheduleDaily runs a function at a specific hour and minute each day.
func scheduleDaily(ctx context.Context, jc *JobClient, hour, minute int, fn func()) {
	for {
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())

		// If we've passed today's scheduled time, schedule for tomorrow
		if now.After(next) {
			next = next.Add(24 * time.Hour)
		}

		waitDuration := next.Sub(now)
		log.Info().
			Time("next_run", next).
			Dur("wait_duration", waitDuration).
			Msg("Scheduled next retention cleanup")

		select {
		case <-ctx.Done():
			return
		case <-time.After(waitDuration):
			fn()
		}
	}
}
