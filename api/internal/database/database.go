package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"api/internal/discord"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/joho/godotenv/autoload"
	"github.com/rs/zerolog/log"
)

// Service represents a service that interacts with a database.
type Service interface {
	// Health returns a map of health status information.
	Health() map[string]string

	// Close terminates the database connection.
	Close() error

	// GetPool returns the underlying connection pool
	GetPool() *pgxpool.Pool
}

type service struct {
	pool *pgxpool.Pool
}

var dbInstance *service

func New() Service {
	// Reuse Connection
	if dbInstance != nil {
		return dbInstance
	}

	// Get DATABASE_URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		discord.AlertDatabaseError(fmt.Errorf("DATABASE_URL environment variable is not set"), nil)
		log.Fatal().Msg("DATABASE_URL environment variable is not set")
	}

	// Parse the config
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Unable to parse DATABASE_URL")
	}

	// Configure connection pool
	config.MaxConns = 50                        // Max connections
	config.MinConns = 5                         // Min connections (always ready)
	config.MaxConnLifetime = 1 * time.Hour      // Recycle connections
	config.MaxConnIdleTime = 30 * time.Minute   // Close idle connections
	config.HealthCheckPeriod = 1 * time.Minute  // Check connection health

	// Create pool
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		discord.AlertDatabaseError(err, map[string]string{"Stage": "pool creation"})
		log.Fatal().Err(err).Msg("Unable to create connection pool")
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		discord.AlertDatabaseError(err, map[string]string{"Stage": "initial ping"})
		log.Fatal().Err(err).Msg("Unable to ping database")
	}

	log.Info().
		Int32("max_conns", config.MaxConns).
		Int32("min_conns", config.MinConns).
		Msg("Successfully connected to database")

	dbInstance = &service{
		pool: pool,
	}

	return dbInstance
}

// GetPool returns the underlying pgxpool.Pool for use with SQLC
func (s *service) GetPool() *pgxpool.Pool {
	return s.pool
}

// Health checks the health of the database connection by pinging the database.
func (s *service) Health() map[string]string {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	stats := make(map[string]string)

	// Ping the database
	err := s.pool.Ping(ctx)
	if err != nil {
		stats["status"] = "down"
		stats["error"] = fmt.Sprintf("db down: %v", err)
		return stats
	}

	// Database is up
	stats["status"] = "up"
	stats["message"] = "It's healthy"

	// Get pool stats
	poolStats := s.pool.Stat()
	stats["total_connections"] = fmt.Sprintf("%d", poolStats.TotalConns())
	stats["idle_connections"] = fmt.Sprintf("%d", poolStats.IdleConns())
	stats["acquired_connections"] = fmt.Sprintf("%d", poolStats.AcquiredConns())

	// Health warnings
	if poolStats.AcquiredConns() > 40 {
		stats["message"] = "The database is experiencing heavy load."
	}

	if poolStats.IdleConns() == 0 && poolStats.TotalConns() > 0 {
		stats["message"] = "No idle connections available, consider increasing pool size."
	}

	return stats
}

// Close closes the database connection pool.
func (s *service) Close() error {
	log.Info().Msg("Closing database connection pool")
	s.pool.Close()
	return nil
}
