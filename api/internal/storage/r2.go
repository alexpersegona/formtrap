package storage

import (
	"bytes"
	"context"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// StorageClient wraps the S3 client for R2 operations
type StorageClient struct {
	client     *s3.Client
	bucketName string
	publicURL  string
}

// UploadedFile represents a file that was uploaded to R2
type UploadedFile struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Path        string `json:"path"`
	URL         string `json:"url"`
	Size        int64  `json:"size"`
	ContentType string `json:"content_type"`
}

// FileValidationConfig holds validation settings for file uploads
type FileValidationConfig struct {
	MaxFileSize      int64    // in bytes
	MaxFileCount     int
	AllowedMimeTypes []string // e.g., ["image/jpeg", "image/png", "application/pdf"]
}

var platformClient *StorageClient

// GetStorageClient returns a storage client for the given space.
// Future: BYOR2 - Check if space has custom R2 config and use that instead.
// For now, always returns the platform bucket client.
func GetStorageClient(spaceID string) (*StorageClient, error) {
	// Future BYOR2 implementation:
	// 1. Query space's custom R2 config from database
	// 2. If custom config exists, create client with those credentials
	// 3. Otherwise, fall back to platform client

	return getPlatformClient()
}

// getPlatformClient returns or creates the platform R2 client
func getPlatformClient() (*StorageClient, error) {
	if platformClient != nil {
		return platformClient, nil
	}

	accountID := os.Getenv("R2_ACCOUNT_ID")
	accessKeyID := os.Getenv("R2_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("R2_BUCKET_NAME")
	publicURL := os.Getenv("R2_PUBLIC_URL")

	if accountID == "" || accessKeyID == "" || secretAccessKey == "" || bucketName == "" {
		return nil, fmt.Errorf("R2 credentials not configured")
	}

	// Create R2 endpoint URL
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	// Create S3 client configured for R2
	client := s3.New(s3.Options{
		Region: "auto",
		BaseEndpoint: &endpoint,
		Credentials: credentials.NewStaticCredentialsProvider(
			accessKeyID,
			secretAccessKey,
			"",
		),
	})

	platformClient = &StorageClient{
		client:     client,
		bucketName: bucketName,
		publicURL:  publicURL,
	}

	log.Info().Str("bucket", bucketName).Msg("R2 storage client initialized")

	return platformClient, nil
}

// UploadFile uploads a single file to R2
// Path structure: submissions/{formId}/{submissionId}/{filename}
func (sc *StorageClient) UploadFile(
	ctx context.Context,
	formID string,
	submissionID string,
	file *multipart.FileHeader,
) (*UploadedFile, error) {
	// Open the file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	// Read file contents
	buf := new(bytes.Buffer)
	size, err := buf.ReadFrom(src)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Generate unique filename while preserving extension
	ext := filepath.Ext(file.Filename)
	uniqueID := uuid.New().String()[:8]
	safeName := sanitizeFilename(file.Filename)
	filename := fmt.Sprintf("%s-%s%s", strings.TrimSuffix(safeName, ext), uniqueID, ext)

	// Build the full path
	key := fmt.Sprintf("submissions/%s/%s/%s", formID, submissionID, filename)

	// Detect content type
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Upload to R2
	_, err = sc.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(sc.bucketName),
		Key:          aws.String(key),
		Body:         bytes.NewReader(buf.Bytes()),
		ContentType:  aws.String(contentType),
		CacheControl: aws.String("public, max-age=31536000, immutable"),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload to R2: %w", err)
	}

	// Build public URL
	publicURL := fmt.Sprintf("%s/%s", sc.publicURL, key)

	log.Info().
		Str("form_id", formID).
		Str("submission_id", submissionID).
		Str("filename", filename).
		Int64("size", size).
		Msg("File uploaded to R2")

	return &UploadedFile{
		ID:          uniqueID,
		Name:        file.Filename,
		Path:        key,
		URL:         publicURL,
		Size:        size,
		ContentType: contentType,
	}, nil
}

// UploadFiles uploads multiple files and returns all uploaded file info
func (sc *StorageClient) UploadFiles(
	ctx context.Context,
	formID string,
	submissionID string,
	files []*multipart.FileHeader,
	config *FileValidationConfig,
) ([]*UploadedFile, error) {
	// Validate file count
	if config != nil && len(files) > config.MaxFileCount {
		return nil, fmt.Errorf("too many files: %d (max %d)", len(files), config.MaxFileCount)
	}

	var uploaded []*UploadedFile

	for _, file := range files {
		// Validate file size
		if config != nil && file.Size > config.MaxFileSize {
			return nil, fmt.Errorf("file %s too large: %d bytes (max %d)", file.Filename, file.Size, config.MaxFileSize)
		}

		// Validate mime type
		if config != nil && len(config.AllowedMimeTypes) > 0 {
			contentType := file.Header.Get("Content-Type")
			if !isAllowedMimeType(contentType, config.AllowedMimeTypes) {
				return nil, fmt.Errorf("file type not allowed: %s", contentType)
			}
		}

		// Upload the file
		uploadedFile, err := sc.UploadFile(ctx, formID, submissionID, file)
		if err != nil {
			// Clean up any files we already uploaded
			for _, f := range uploaded {
				_ = sc.DeleteFile(ctx, f.Path)
			}
			return nil, err
		}

		uploaded = append(uploaded, uploadedFile)
	}

	return uploaded, nil
}

// DeleteFile deletes a file from R2
func (sc *StorageClient) DeleteFile(ctx context.Context, key string) error {
	_, err := sc.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(sc.bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		log.Warn().Err(err).Str("key", key).Msg("Failed to delete file from R2")
		return err
	}

	log.Info().Str("key", key).Msg("File deleted from R2")
	return nil
}

// DeleteSubmissionFiles deletes all files for a submission
func (sc *StorageClient) DeleteSubmissionFiles(ctx context.Context, formID, submissionID string) error {
	prefix := fmt.Sprintf("submissions/%s/%s/", formID, submissionID)

	// List objects with prefix
	output, err := sc.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(sc.bucketName),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		return fmt.Errorf("failed to list submission files: %w", err)
	}

	// Delete each object
	for _, obj := range output.Contents {
		if err := sc.DeleteFile(ctx, *obj.Key); err != nil {
			log.Warn().Err(err).Str("key", *obj.Key).Msg("Failed to delete file during cleanup")
		}
	}

	return nil
}

// sanitizeFilename removes problematic characters from filenames
func sanitizeFilename(filename string) string {
	// Replace spaces with underscores
	name := strings.ReplaceAll(filename, " ", "_")

	// Remove or replace other problematic characters
	replacer := strings.NewReplacer(
		"/", "_",
		"\\", "_",
		":", "_",
		"*", "_",
		"?", "_",
		"\"", "_",
		"<", "_",
		">", "_",
		"|", "_",
	)

	return replacer.Replace(name)
}

// isAllowedMimeType checks if a content type is in the allowed list
func isAllowedMimeType(contentType string, allowed []string) bool {
	// Normalize content type (remove parameters like charset)
	parts := strings.Split(contentType, ";")
	ct := strings.TrimSpace(parts[0])

	for _, a := range allowed {
		if strings.EqualFold(ct, a) {
			return true
		}
		// Support wildcards like "image/*"
		if strings.HasSuffix(a, "/*") {
			prefix := strings.TrimSuffix(a, "/*")
			if strings.HasPrefix(ct, prefix+"/") {
				return true
			}
		}
	}
	return false
}
