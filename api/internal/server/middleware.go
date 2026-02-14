package server

import (
	"context"
	"fmt"
	"net/http"
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
