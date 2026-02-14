package storage

import (
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/rs/zerolog/log"
)

// UserStorageConfig holds the deserialized storage credentials for a user.
type UserStorageConfig struct {
	Endpoint        string `json:"endpoint"`
	AccessKeyID     string `json:"accessKeyId"`
	SecretAccessKey  string `json:"secretAccessKey"`
	Bucket          string `json:"bucket"`
	PublicURL       string `json:"publicUrl"`
	Region          string `json:"region"`
}

// UserStorageManager manages per-user S3 storage clients.
type UserStorageManager struct {
	mu      sync.RWMutex
	clients map[string]*userStorageEntry
}

type userStorageEntry struct {
	client       *StorageClient
	lastAccessed time.Time
}

var userStorageInstance *UserStorageManager
var userStorageOnce sync.Once

const storageIdleTimeout = 30 * time.Minute

// GetUserStorageManager returns the singleton UserStorageManager.
func GetUserStorageManager() *UserStorageManager {
	userStorageOnce.Do(func() {
		userStorageInstance = &UserStorageManager{
			clients: make(map[string]*userStorageEntry),
		}
		go userStorageInstance.evictionLoop()
	})
	return userStorageInstance
}

// GetClient returns a StorageClient for the given user.
// Creates a new client if one doesn't exist.
func (usm *UserStorageManager) GetClient(userID string, config *UserStorageConfig) (*StorageClient, error) {
	// Check cache first (read lock)
	usm.mu.RLock()
	if entry, ok := usm.clients[userID]; ok {
		entry.lastAccessed = time.Now()
		usm.mu.RUnlock()
		return entry.client, nil
	}
	usm.mu.RUnlock()

	// Create new client (write lock)
	usm.mu.Lock()
	defer usm.mu.Unlock()

	// Double-check after acquiring write lock
	if entry, ok := usm.clients[userID]; ok {
		entry.lastAccessed = time.Now()
		return entry.client, nil
	}

	region := config.Region
	if region == "" {
		region = "auto"
	}

	s3Client := s3.New(s3.Options{
		Region: region,
		Credentials: credentials.NewStaticCredentialsProvider(
			config.AccessKeyID,
			config.SecretAccessKey,
			"",
		),
		BaseEndpoint: aws.String(config.Endpoint),
	})

	storageClient := &StorageClient{
		client:     s3Client,
		bucketName: config.Bucket,
		publicURL:  config.PublicURL,
	}

	usm.clients[userID] = &userStorageEntry{
		client:       storageClient,
		lastAccessed: time.Now(),
	}

	log.Debug().Str("userId", userID).Msg("Created new user storage client")
	return storageClient, nil
}

// evictionLoop periodically removes idle storage clients.
func (usm *UserStorageManager) evictionLoop() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		usm.mu.Lock()
		now := time.Now()
		for userID, entry := range usm.clients {
			if now.Sub(entry.lastAccessed) > storageIdleTimeout {
				delete(usm.clients, userID)
				log.Debug().Str("userId", userID).Msg("Evicted idle user storage client")
			}
		}
		usm.mu.Unlock()
	}
}

// CloseAll removes all cached storage clients. Call on server shutdown.
func (usm *UserStorageManager) CloseAll() {
	usm.mu.Lock()
	defer usm.mu.Unlock()

	for userID := range usm.clients {
		delete(usm.clients, userID)
	}
	log.Info().Msg("All user storage clients closed")
}
