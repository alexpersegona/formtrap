package server

import (
	"context"
	"net/http"
	"time"

	"api/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "*"}, // Add your frontend URL
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true, // Enable cookies/auth
	}))

	r.GET("/", s.HelloWorldHandler)

	r.GET("/health", s.healthHandler)

	// Test database query
	r.GET("/test-db", s.testDatabaseHandler)

	// Form submission endpoint (public - no auth required)
	formHandler := handlers.NewFormHandler(s.db.GetPool())
	r.POST("/forms/:formId", RateLimitMiddleware(), SpamCheckMiddleware(), formHandler.HandleSubmission)

	return r
}

func (s *Server) HelloWorldHandler(c *gin.Context) {
	resp := make(map[string]string)
	resp["message"] = "Hello World"

	c.JSON(http.StatusOK, resp)
}

func (s *Server) healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, s.db.Health())
}

func (s *Server) testDatabaseHandler(c *gin.Context) {
	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Get the pool
	pool := s.db.GetPool()

	// Test 1: Count organizations
	var orgCount int64
	err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM organization").Scan(&orgCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to count organizations",
			"details": err.Error(),
		})
		return
	}

	// Test 2: Count forms
	var formCount int64
	err = pool.QueryRow(ctx, "SELECT COUNT(*) FROM form").Scan(&formCount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to count forms",
			"details": err.Error(),
		})
		return
	}

	// Test 3: Get a sample form (if any exist)
	var sampleFormID, sampleFormName string
	var hasForm bool
	err = pool.QueryRow(ctx, "SELECT id, name FROM form LIMIT 1").Scan(&sampleFormID, &sampleFormName)
	if err == nil {
		hasForm = true
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Database connection successful!",
		"org_count":    orgCount,
		"form_count":   formCount,
		"has_forms":    hasForm,
		"sample_form":  map[string]string{"id": sampleFormID, "name": sampleFormName},
	})
}
