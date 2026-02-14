package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/joho/godotenv/autoload"

	"api/internal/cleanup"
	"api/internal/database"
	"api/internal/jobs"

	"github.com/rs/zerolog/log"
)

type Server struct {
	port int

	db         database.Service
	platformDB *database.PlatformDB
	jobClient  *jobs.JobClient
}

func NewServer() *http.Server {
	port, _ := strconv.Atoi(os.Getenv("PORT"))
	newServer := &Server{
		port: port,

		db:         database.New(),
		platformDB: database.NewPlatformDB(),
	}

	// Initialize job queue client
	var err error
	newServer.jobClient, err = jobs.NewJobClient(newServer.db.GetPool())
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create job client")
	}

	// Start job queue processing
	ctx := context.Background()
	if err := newServer.jobClient.Start(ctx); err != nil {
		log.Fatal().Err(err).Msg("Failed to start job client")
	}

	// Start job scheduler for periodic tasks
	jobs.StartScheduler(ctx, newServer.jobClient)

	// Start background cleanup scheduler for spam (legacy - to be migrated to jobs)
	cleanup.StartSpamCleanupScheduler(newServer.db.GetPool())

	// Declare Server config
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", newServer.port),
		Handler:      newServer.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}

// GetJobClient returns the job queue client for enqueueing jobs.
func (s *Server) GetJobClient() *jobs.JobClient {
	return s.jobClient
}
