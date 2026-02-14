package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"api/internal/crypto"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

// DeleteResult contains the results of a batch delete operation.
type DeleteResult struct {
	ItemsDeleted int
	ItemsFailed  int
	Error        error
}

// ProviderBatchSizes maps storage providers to their batch delete limits.
var ProviderBatchSizes = map[string]int{
	"r2":        1000, // Cloudflare R2 supports up to 1000 per batch
	"s3":        1000, // AWS S3 supports up to 1000 per batch
	"backblaze": 100,  // B2 is more conservative
	"gcs":       100,  // GCS batch size
}

// GetBatchSize returns the optimal batch size for a provider.
func GetBatchSize(provider string) int {
	if size, ok := ProviderBatchSizes[provider]; ok {
		return size
	}
	return 100 // Conservative default
}

// DeleteFormFiles deletes ALL files for a form using batch operations.
// Returns a DeleteResult with counts and any error.
func (sc *StorageClient) DeleteFormFiles(ctx context.Context, formID string) *DeleteResult {
	prefix := fmt.Sprintf("submissions/%s/", formID)
	return sc.deleteByPrefix(ctx, prefix)
}

// DeleteSubmissionFilesWithResult deletes all files for a submission and returns detailed result.
func (sc *StorageClient) DeleteSubmissionFilesWithResult(ctx context.Context, formID, submissionID string) *DeleteResult {
	prefix := fmt.Sprintf("submissions/%s/%s/", formID, submissionID)
	return sc.deleteByPrefix(ctx, prefix)
}

// deleteByPrefix lists and batch deletes all objects with the given prefix.
func (sc *StorageClient) deleteByPrefix(ctx context.Context, prefix string) *DeleteResult {
	result := &DeleteResult{}
	batchSize := GetBatchSize("r2") // Default to R2 batch size

	var continuationToken *string
	for {
		// List objects with prefix
		listInput := &s3.ListObjectsV2Input{
			Bucket:            aws.String(sc.bucketName),
			Prefix:            aws.String(prefix),
			MaxKeys:           aws.Int32(int32(batchSize)),
			ContinuationToken: continuationToken,
		}

		output, err := sc.client.ListObjectsV2(ctx, listInput)
		if err != nil {
			result.Error = fmt.Errorf("failed to list objects with prefix %s: %w", prefix, err)
			return result
		}

		if len(output.Contents) == 0 {
			break
		}

		// Build delete request
		var objects []types.ObjectIdentifier
		for _, obj := range output.Contents {
			objects = append(objects, types.ObjectIdentifier{
				Key: obj.Key,
			})
		}

		// Batch delete
		deleteInput := &s3.DeleteObjectsInput{
			Bucket: aws.String(sc.bucketName),
			Delete: &types.Delete{
				Objects: objects,
				Quiet:   aws.Bool(true),
			},
		}

		deleteOutput, err := sc.client.DeleteObjects(ctx, deleteInput)
		if err != nil {
			result.Error = fmt.Errorf("failed to delete objects: %w", err)
			return result
		}

		// Count results
		result.ItemsDeleted += len(objects) - len(deleteOutput.Errors)
		result.ItemsFailed += len(deleteOutput.Errors)

		// Log any errors
		for _, e := range deleteOutput.Errors {
			log.Warn().
				Str("key", aws.ToString(e.Key)).
				Str("code", aws.ToString(e.Code)).
				Str("message", aws.ToString(e.Message)).
				Msg("Failed to delete object")
		}

		// Check if there are more objects
		if !aws.ToBool(output.IsTruncated) {
			break
		}
		continuationToken = output.NextContinuationToken
	}

	return result
}

// User storage client management
var (
	userStorageClients   = make(map[string]*StorageClient)
	userStorageClientsMu sync.RWMutex
)

// StorageConfig represents user storage configuration.
type StorageConfig struct {
	Provider        string `json:"provider"` // "r2", "s3", "backblaze", "gcs"
	Endpoint        string `json:"endpoint"`
	AccessKeyID     string `json:"access_key_id"`
	SecretAccessKey string `json:"secret_access_key"`
	Bucket          string `json:"bucket"`
	PublicURL       string `json:"public_url"`
	Region          string `json:"region"`
}

// GetUserStorageClient returns a storage client configured for the user's storage.
func GetUserStorageClient(ctx context.Context, pool *pgxpool.Pool, userID string) (*StorageClient, error) {
	// Check cache first
	userStorageClientsMu.RLock()
	if client, ok := userStorageClients[userID]; ok {
		userStorageClientsMu.RUnlock()
		return client, nil
	}
	userStorageClientsMu.RUnlock()

	// Get user's storage config from database
	var configEncrypted []byte
	var provider string
	err := pool.QueryRow(ctx, `
		SELECT storage_provider, storage_config_encrypted
		FROM connection
		WHERE user_id = $1 AND storage_status = 'connected'
	`, userID).Scan(&provider, &configEncrypted)

	if err != nil {
		return nil, fmt.Errorf("failed to get user storage config: %w", err)
	}

	if len(configEncrypted) == 0 {
		return nil, fmt.Errorf("user has no storage configured")
	}

	// Decrypt config (using crypto package)
	config, err := decryptStorageConfig(configEncrypted)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt storage config: %w", err)
	}

	// Create client
	client, err := createUserStorageClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create user storage client: %w", err)
	}

	// Cache the client
	userStorageClientsMu.Lock()
	userStorageClients[userID] = client
	userStorageClientsMu.Unlock()

	return client, nil
}

// decryptStorageConfig decrypts the storage configuration.
// The encrypted data is an AES-256-GCM encrypted JSON string
// in format: base64(iv):base64(authTag):base64(ciphertext)
func decryptStorageConfig(encrypted []byte) (*StorageConfig, error) {
	// The encrypted bytes are actually the encrypted string
	encryptedStr := string(encrypted)

	// Decrypt using the crypto package
	decrypted, err := crypto.Decrypt(encryptedStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt storage config: %w", err)
	}

	// Parse JSON into StorageConfig
	var config StorageConfig
	if err := json.Unmarshal([]byte(decrypted), &config); err != nil {
		return nil, fmt.Errorf("failed to parse storage config JSON: %w", err)
	}

	return &config, nil
}

// createUserStorageClient creates an S3-compatible client from config.
func createUserStorageClient(config *StorageConfig) (*StorageClient, error) {
	if config == nil {
		return nil, fmt.Errorf("nil storage config")
	}

	// All supported providers use S3-compatible APIs
	region := config.Region
	if region == "" {
		region = "auto"
	}

	client := s3.New(s3.Options{
		Region:       region,
		BaseEndpoint: &config.Endpoint,
		Credentials: aws.NewCredentialsCache(
			&staticCredentialsProvider{
				accessKeyID:     config.AccessKeyID,
				secretAccessKey: config.SecretAccessKey,
			},
		),
	})

	return &StorageClient{
		client:     client,
		bucketName: config.Bucket,
		publicURL:  config.PublicURL,
	}, nil
}

// staticCredentialsProvider implements aws.CredentialsProvider.
type staticCredentialsProvider struct {
	accessKeyID     string
	secretAccessKey string
}

func (p *staticCredentialsProvider) Retrieve(ctx context.Context) (aws.Credentials, error) {
	return aws.Credentials{
		AccessKeyID:     p.accessKeyID,
		SecretAccessKey: p.secretAccessKey,
	}, nil
}

// ClearUserStorageClient removes a cached user storage client.
func ClearUserStorageClient(userID string) {
	userStorageClientsMu.Lock()
	delete(userStorageClients, userID)
	userStorageClientsMu.Unlock()
}

// StorageObject represents a file in storage.
type StorageObject struct {
	Key          string
	Size         int64
	LastModified int64 // Unix timestamp
}

// ListObjectsResult contains the results of a list operation.
type ListObjectsResult struct {
	Objects           []StorageObject
	ContinuationToken *string
	IsTruncated       bool
	Error             error
}

// ListObjects lists objects with the given prefix.
// Returns up to maxKeys objects per call. Use ContinuationToken for pagination.
func (sc *StorageClient) ListObjects(ctx context.Context, prefix string, maxKeys int32, continuationToken *string) *ListObjectsResult {
	result := &ListObjectsResult{}

	listInput := &s3.ListObjectsV2Input{
		Bucket:            aws.String(sc.bucketName),
		Prefix:            aws.String(prefix),
		MaxKeys:           aws.Int32(maxKeys),
		ContinuationToken: continuationToken,
	}

	output, err := sc.client.ListObjectsV2(ctx, listInput)
	if err != nil {
		result.Error = fmt.Errorf("failed to list objects: %w", err)
		return result
	}

	for _, obj := range output.Contents {
		result.Objects = append(result.Objects, StorageObject{
			Key:          aws.ToString(obj.Key),
			Size:         aws.ToInt64(obj.Size),
			LastModified: obj.LastModified.Unix(),
		})
	}

	result.IsTruncated = aws.ToBool(output.IsTruncated)
	result.ContinuationToken = output.NextContinuationToken

	return result
}
