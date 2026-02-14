package database

import (
	"context"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// UserPool manages per-user database connection pools.
type UserPool struct {
	mu    sync.RWMutex
	pools map[string]*userPoolEntry
}

type userPoolEntry struct {
	pool         *pgxpool.Pool
	lastAccessed time.Time
}

var userPoolInstance *UserPool
var userPoolOnce sync.Once

const (
	maxConnsPerUser = 5
	poolIdleTimeout = 30 * time.Minute
	evictionTick    = time.Minute
)

// GetUserPoolManager returns the singleton UserPool manager.
func GetUserPoolManager() *UserPool {
	userPoolOnce.Do(func() {
		userPoolInstance = &UserPool{
			pools: make(map[string]*userPoolEntry),
		}
		go userPoolInstance.evictionLoop()
	})
	return userPoolInstance
}

// GetPool returns a connection pool for the given user.
// Creates a new pool if one doesn't exist.
func (up *UserPool) GetPool(ctx context.Context, userID string, connString string) (*pgxpool.Pool, error) {
	// Check cache first (read lock)
	up.mu.RLock()
	if entry, ok := up.pools[userID]; ok {
		entry.lastAccessed = time.Now()
		up.mu.RUnlock()
		return entry.pool, nil
	}
	up.mu.RUnlock()

	// Create new pool (write lock)
	up.mu.Lock()
	defer up.mu.Unlock()

	// Double-check after acquiring write lock
	if entry, ok := up.pools[userID]; ok {
		entry.lastAccessed = time.Now()
		return entry.pool, nil
	}

	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return nil, err
	}

	config.MaxConns = maxConnsPerUser
	config.MinConns = 1
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 10 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	// Verify connection works
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	up.pools[userID] = &userPoolEntry{
		pool:         pool,
		lastAccessed: time.Now(),
	}

	log.Debug().Str("userId", userID).Msg("Created new user database pool")
	return pool, nil
}

// evictionLoop periodically removes idle pools.
func (up *UserPool) evictionLoop() {
	ticker := time.NewTicker(evictionTick)
	defer ticker.Stop()

	for range ticker.C {
		up.mu.Lock()
		now := time.Now()
		for userID, entry := range up.pools {
			if now.Sub(entry.lastAccessed) > poolIdleTimeout {
				entry.pool.Close()
				delete(up.pools, userID)
				log.Debug().Str("userId", userID).Msg("Evicted idle user database pool")
			}
		}
		up.mu.Unlock()
	}
}

// CloseAll closes all user pools. Call on server shutdown.
func (up *UserPool) CloseAll() {
	up.mu.Lock()
	defer up.mu.Unlock()

	for userID, entry := range up.pools {
		entry.pool.Close()
		delete(up.pools, userID)
	}
	log.Info().Msg("All user database pools closed")
}
