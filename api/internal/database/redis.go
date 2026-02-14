package database

import (
	"context"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
	_ "github.com/joho/godotenv/autoload"
	"github.com/rs/zerolog/log"
)

var redisClient *redis.Client

// GetRedisClient returns a singleton Redis client
func GetRedisClient() *redis.Client {
	if redisClient != nil {
		return redisClient
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to parse REDIS_URL")
	}

	redisClient = redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to Redis")
	}

	log.Info().Str("url", redisURL).Msg("Successfully connected to Redis")

	return redisClient
}
