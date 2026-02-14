package database

import (
	"context"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// PlatformDB provides access to FormTrap's own database.
// Used for formEndpoint lookups and connection credential lookups.
type PlatformDB struct {
	pool *pgxpool.Pool
}

var platformDBInstance *PlatformDB

// NewPlatformDB creates a connection pool to FormTrap's platform database.
// Uses PLATFORM_DATABASE_URL env var (falls back to DATABASE_URL for backwards compatibility).
func NewPlatformDB() *PlatformDB {
	if platformDBInstance != nil {
		return platformDBInstance
	}

	databaseURL := os.Getenv("PLATFORM_DATABASE_URL")
	if databaseURL == "" {
		// Fall back to DATABASE_URL for backwards compatibility
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		log.Fatal().Msg("PLATFORM_DATABASE_URL (or DATABASE_URL) environment variable is not set")
	}

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Unable to parse PLATFORM_DATABASE_URL")
	}

	// Smaller pool for platform lookups
	config.MaxConns = 20
	config.MinConns = 3
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	config.HealthCheckPeriod = time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatal().Err(err).Msg("Unable to create platform database pool")
	}

	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("Unable to ping platform database")
	}

	platformDBInstance = &PlatformDB{pool: pool}
	log.Info().Msg("Platform database connected")

	return platformDBInstance
}

// GetPool returns the underlying connection pool.
func (p *PlatformDB) GetPool() *pgxpool.Pool {
	return p.pool
}

// Close closes the platform database connection pool.
func (p *PlatformDB) Close() {
	if p.pool != nil {
		p.pool.Close()
	}
}

// FormEndpoint represents the routing info for a form submission.
type FormEndpoint struct {
	FormID         string
	UserID         string
	OrganizationID string
	IsActive       bool
}

// GetFormEndpoint looks up form routing information by formId.
func (p *PlatformDB) GetFormEndpoint(ctx context.Context, formID string) (*FormEndpoint, error) {
	var endpoint FormEndpoint
	err := p.pool.QueryRow(ctx,
		`SELECT "formId", "userId", "organizationId", "isActive"
		 FROM "formEndpoint"
		 WHERE "formId" = $1`,
		formID,
	).Scan(&endpoint.FormID, &endpoint.UserID, &endpoint.OrganizationID, &endpoint.IsActive)

	if err != nil {
		return nil, err
	}

	return &endpoint, nil
}

// UserConnection represents the encrypted credentials for a user's infrastructure.
type UserConnection struct {
	UserID                      string
	DBConnectionStringEncrypted string
	DBStatus                    string
	StorageConfigEncrypted      *string
	StorageStatus               string
	SpamProvider                string
	SpamSiteKey                 *string
	SpamSecretKeyEncrypted      *string
	// BYO Email provider fields
	EmailProvider           *string
	EmailConfigEncrypted    *string
	EmailStatus             string
	EmailLastCheckedAt      *time.Time
	EmailError              *string
	// Platform email cap (for fallback)
	EmailCountThisMonth int
	EmailCountResetAt   *time.Time
	SchemaInitialized   bool
}

// GetUserConnection fetches a user's infrastructure connection credentials.
func (p *PlatformDB) GetUserConnection(ctx context.Context, userID string) (*UserConnection, error) {
	var conn UserConnection
	err := p.pool.QueryRow(ctx,
		`SELECT "userId", "dbConnectionStringEncrypted", "dbStatus",
		        "storageConfigEncrypted", "storageStatus",
		        "spamProvider", "spamSiteKey", "spamSecretKeyEncrypted",
		        "emailProvider", "emailConfigEncrypted", "emailStatus",
		        "emailLastCheckedAt", "emailError",
		        "emailCountThisMonth", "emailCountResetAt", "schemaInitialized"
		 FROM "connection"
		 WHERE "userId" = $1`,
		userID,
	).Scan(
		&conn.UserID, &conn.DBConnectionStringEncrypted, &conn.DBStatus,
		&conn.StorageConfigEncrypted, &conn.StorageStatus,
		&conn.SpamProvider, &conn.SpamSiteKey, &conn.SpamSecretKeyEncrypted,
		&conn.EmailProvider, &conn.EmailConfigEncrypted, &conn.EmailStatus,
		&conn.EmailLastCheckedAt, &conn.EmailError,
		&conn.EmailCountThisMonth, &conn.EmailCountResetAt, &conn.SchemaInitialized,
	)

	if err != nil {
		return nil, err
	}

	return &conn, nil
}

// IncrementEmailCount atomically increments the email counter for a user.
// If the reset date has passed, it resets the counter first.
func (p *PlatformDB) IncrementEmailCount(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx,
		`UPDATE "connection"
		 SET "emailCountThisMonth" = CASE
		     WHEN "emailCountResetAt" IS NULL OR "emailCountResetAt" <= NOW()
		     THEN 1
		     ELSE "emailCountThisMonth" + 1
		 END,
		 "emailCountResetAt" = CASE
		     WHEN "emailCountResetAt" IS NULL OR "emailCountResetAt" <= NOW()
		     THEN NOW() + INTERVAL '30 days'
		     ELSE "emailCountResetAt"
		 END,
		 "updatedAt" = NOW()
		 WHERE "userId" = $1`,
		userID,
	)
	return err
}

// GetEmailCount returns the current email count for a user, resetting if needed.
func (p *PlatformDB) GetEmailCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := p.pool.QueryRow(ctx,
		`SELECT CASE
		     WHEN "emailCountResetAt" IS NULL OR "emailCountResetAt" <= NOW()
		     THEN 0
		     ELSE "emailCountThisMonth"
		 END
		 FROM "connection"
		 WHERE "userId" = $1`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// IsOrganizationPaused checks if an organization is paused.
func (p *PlatformDB) IsOrganizationPaused(ctx context.Context, orgID string) (bool, error) {
	var isPaused bool
	err := p.pool.QueryRow(ctx,
		`SELECT "isPaused" FROM "organization" WHERE id = $1`,
		orgID,
	).Scan(&isPaused)

	if err != nil {
		return false, err
	}

	return isPaused, nil
}
