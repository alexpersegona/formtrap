package handlers

import (
	"context"
	"net/http"
	"time"

	"api/internal/jobs"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// JobsHandler handles job-related API endpoints.
type JobsHandler struct {
	jobClient *jobs.JobClient
	pool      *pgxpool.Pool
}

// NewJobsHandler creates a new JobsHandler.
func NewJobsHandler(jobClient *jobs.JobClient, pool *pgxpool.Pool) *JobsHandler {
	return &JobsHandler{
		jobClient: jobClient,
		pool:      pool,
	}
}

// TriggerOrphanScanRequest is the request body for triggering an orphan scan.
type TriggerOrphanScanRequest struct {
	MinAgeMinutes int  `json:"min_age_minutes"`
	DryRun        bool `json:"dry_run"`
}

// TriggerOrphanScan handles POST /api/admin/jobs/orphan-scan
func (h *JobsHandler) TriggerOrphanScan(c *gin.Context) {
	var req TriggerOrphanScanRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		// Default values if no body provided
		req.MinAgeMinutes = 60
		req.DryRun = true
	}

	jobID, err := h.jobClient.EnqueueOrphanScan(c.Request.Context(), req.MinAgeMinutes, req.DryRun)
	if err != nil {
		log.Error().Err(err).Msg("Failed to enqueue orphan scan")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ENQUEUE_FAILED",
			"message": "Failed to enqueue orphan scan job",
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Orphan scan job queued",
		"job_id":  jobID,
		"dry_run": req.DryRun,
	})
}

// OrphanScanResult represents a scan result for the API.
type OrphanScanResult struct {
	ID                   int       `json:"id"`
	JobID                int64     `json:"job_id"`
	ScannedCount         int       `json:"scanned_count"`
	OrphanCount          int       `json:"orphan_count"`
	DeletedCount         *int      `json:"deleted_count"`
	TotalOrphanSizeBytes int64     `json:"total_orphan_size_bytes"`
	DryRun               bool      `json:"dry_run"`
	DurationMs           int       `json:"duration_ms"`
	Status               string    `json:"status"`
	CreatedAt            time.Time `json:"created_at"`
}

// OrphanFile represents an orphan file for the API.
type OrphanFile struct {
	ID           int       `json:"id"`
	FileKey      string    `json:"file_key"`
	FileSize     int64     `json:"file_size"`
	LastModified time.Time `json:"last_modified"`
	FormID       *string   `json:"form_id"`
	SubmissionID *string   `json:"submission_id"`
}

// GetOrphanScanResults handles GET /api/admin/jobs/orphan-scan
func (h *JobsHandler) GetOrphanScanResults(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	// Get recent scan results
	rows, err := h.pool.Query(ctx, `
		SELECT id, job_id, scanned_count, orphan_count, deleted_count,
		       total_orphan_size_bytes, dry_run, duration_ms, status, created_at
		FROM orphan_scan_result
		ORDER BY created_at DESC
		LIMIT 20
	`)
	if err != nil {
		log.Error().Err(err).Msg("Failed to query orphan scan results")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "QUERY_FAILED",
			"message": "Failed to query orphan scan results",
		})
		return
	}
	defer rows.Close()

	var results []OrphanScanResult
	for rows.Next() {
		var r OrphanScanResult
		if err := rows.Scan(
			&r.ID, &r.JobID, &r.ScannedCount, &r.OrphanCount, &r.DeletedCount,
			&r.TotalOrphanSizeBytes, &r.DryRun, &r.DurationMs, &r.Status, &r.CreatedAt,
		); err != nil {
			log.Warn().Err(err).Msg("Failed to scan orphan scan result row")
			continue
		}
		results = append(results, r)
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
	})
}

// GetOrphanFiles handles GET /api/admin/jobs/orphan-scan/:jobId/files
func (h *JobsHandler) GetOrphanFiles(c *gin.Context) {
	jobID := c.Param("jobId")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	rows, err := h.pool.Query(ctx, `
		SELECT id, file_key, file_size, last_modified, form_id, submission_id
		FROM orphan_file
		WHERE scan_job_id = $1
		ORDER BY file_size DESC
		LIMIT 100
	`, jobID)
	if err != nil {
		log.Error().Err(err).Str("job_id", jobID).Msg("Failed to query orphan files")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "QUERY_FAILED",
			"message": "Failed to query orphan files",
		})
		return
	}
	defer rows.Close()

	var files []OrphanFile
	for rows.Next() {
		var f OrphanFile
		if err := rows.Scan(
			&f.ID, &f.FileKey, &f.FileSize, &f.LastModified, &f.FormID, &f.SubmissionID,
		); err != nil {
			log.Warn().Err(err).Msg("Failed to scan orphan file row")
			continue
		}
		files = append(files, f)
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
	})
}
