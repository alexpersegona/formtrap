package email

import (
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// UserEmailManager manages cached email providers for users.
// Providers are cached to avoid repeated config parsing/initialization.
type UserEmailManager struct {
	mu        sync.RWMutex
	providers map[string]*cachedProvider
}

type cachedProvider struct {
	provider  EmailProvider
	createdAt time.Time
}

const (
	// How long to cache email provider instances before recreating
	providerCacheTTL = 30 * time.Minute
)

var (
	userEmailMgr     *UserEmailManager
	userEmailMgrOnce sync.Once
)

// GetUserEmailManager returns the singleton user email manager.
func GetUserEmailManager() *UserEmailManager {
	userEmailMgrOnce.Do(func() {
		userEmailMgr = &UserEmailManager{
			providers: make(map[string]*cachedProvider),
		}
		// Start cleanup goroutine
		go userEmailMgr.cleanupLoop()
	})
	return userEmailMgr
}

// GetProvider returns a cached email provider for the user, creating one if needed.
// providerType should be: smtp, sendgrid, resend, mailgun, aws_ses
// configJSON is the decrypted JSON config for the provider.
func (m *UserEmailManager) GetProvider(userID, providerType, configJSON string) (EmailProvider, error) {
	m.mu.RLock()
	cached, exists := m.providers[userID]
	m.mu.RUnlock()

	// Return cached provider if still valid
	if exists && time.Since(cached.createdAt) < providerCacheTTL {
		return cached.provider, nil
	}

	// Create new provider
	provider, err := NewProvider(providerType, configJSON)
	if err != nil {
		return nil, err
	}

	// Cache it
	m.mu.Lock()
	m.providers[userID] = &cachedProvider{
		provider:  provider,
		createdAt: time.Now(),
	}
	m.mu.Unlock()

	log.Debug().Str("user_id", userID).Str("provider", providerType).Msg("Created new email provider for user")

	return provider, nil
}

// Evict removes a user's cached email provider.
// Call this when user updates their email config.
func (m *UserEmailManager) Evict(userID string) {
	m.mu.Lock()
	delete(m.providers, userID)
	m.mu.Unlock()

	log.Debug().Str("user_id", userID).Msg("Evicted cached email provider")
}

// cleanupLoop periodically removes stale cached providers.
func (m *UserEmailManager) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		m.cleanup()
	}
}

func (m *UserEmailManager) cleanup() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for userID, cached := range m.providers {
		if now.Sub(cached.createdAt) > providerCacheTTL {
			delete(m.providers, userID)
			log.Debug().Str("user_id", userID).Msg("Cleaned up stale email provider")
		}
	}
}
