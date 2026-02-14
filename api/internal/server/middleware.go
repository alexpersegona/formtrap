package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"api/internal/database"

	"github.com/gin-gonic/gin"
)

// RateLimitMiddleware implements rate limiting using Redis
func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		redis := database.GetRedisClient()
		ctx := context.Background()

		// Get client IP
		clientIP := c.ClientIP()

		// Rate limit keys
		hourKey := fmt.Sprintf("ratelimit:ip:%s:hour", clientIP)
		minuteKey := fmt.Sprintf("ratelimit:ip:%s:minute", clientIP)

		// Check hourly limit (10 submissions per hour)
		hourCount, err := redis.Incr(ctx, hourKey).Result()
		if err == nil {
			// Set expiry if this is the first request
			if hourCount == 1 {
				redis.Expire(ctx, hourKey, 1*time.Hour)
			}

			if hourCount > 10 {
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error":   "RATE_LIMIT_EXCEEDED",
					"message": "Too many submissions. Please try again later.",
				})
				c.Abort()
				return
			}
		}

		// Check per-minute limit (3 submissions per minute)
		minuteCount, err := redis.Incr(ctx, minuteKey).Result()
		if err == nil {
			// Set expiry if this is the first request
			if minuteCount == 1 {
				redis.Expire(ctx, minuteKey, 1*time.Minute)
			}

			if minuteCount > 3 {
				c.JSON(http.StatusTooManyRequests, gin.H{
					"error":   "RATE_LIMIT_EXCEEDED",
					"message": "Too many submissions. Please slow down.",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// SpamCheckMiddleware checks if IP is in spam blocklist
func SpamCheckMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		redis := database.GetRedisClient()
		ctx := context.Background()

		clientIP := c.ClientIP()

		// Check if IP is in spam blocklist
		isSpam, err := redis.SIsMember(ctx, "spam_ips", clientIP).Result()
		if err == nil && isSpam {
			// Return success to fool bots, but mark as spam internally
			c.Set("is_spam_ip", true)
			c.Set("spam_reason", "ip_blocklist")
		}

		c.Next()
	}
}

// AdminAuthMiddleware validates the admin API key for protected endpoints.
// The API key should be passed in the Authorization header as "Bearer <key>"
// or as a query parameter "api_key".
func AdminAuthMiddleware() gin.HandlerFunc {
	adminAPIKey := os.Getenv("ADMIN_API_KEY")

	return func(c *gin.Context) {
		if adminAPIKey == "" {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "ADMIN_API_KEY_NOT_CONFIGURED",
				"message": "Admin API key not configured on server",
			})
			c.Abort()
			return
		}

		// Check Authorization header first
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// Expected format: "Bearer <api_key>"
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				token := authHeader[7:]
				if token == adminAPIKey {
					c.Next()
					return
				}
			}
		}

		// Check query parameter as fallback
		queryKey := c.Query("api_key")
		if queryKey == adminAPIKey {
			c.Next()
			return
		}

		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "UNAUTHORIZED",
			"message": "Invalid or missing admin API key",
		})
		c.Abort()
	}
}
