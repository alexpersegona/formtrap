package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/rs/zerolog/log"
)

// CaptchaVerifier verifies CAPTCHA tokens against provider APIs.
type CaptchaVerifier struct {
	httpClient *http.Client
}

// CaptchaResult holds the verification outcome.
type CaptchaResult struct {
	Success bool
	Error   string
}

var defaultVerifier = &CaptchaVerifier{
	httpClient: &http.Client{Timeout: 5 * time.Second},
}

// VerifyCaptcha checks a CAPTCHA response token against the appropriate provider.
func VerifyCaptcha(provider, secretKey, token, remoteIP string) *CaptchaResult {
	return defaultVerifier.Verify(provider, secretKey, token, remoteIP)
}

// Verify dispatches to the correct provider verification endpoint.
func (v *CaptchaVerifier) Verify(provider, secretKey, token, remoteIP string) *CaptchaResult {
	if token == "" {
		return &CaptchaResult{Success: false, Error: "missing captcha token"}
	}

	var endpoint string
	switch provider {
	case "turnstile":
		endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
	case "recaptcha":
		endpoint = "https://www.google.com/recaptcha/api/siteverify"
	case "hcaptcha":
		endpoint = "https://api.hcaptcha.com/siteverify"
	default:
		return &CaptchaResult{Success: false, Error: fmt.Sprintf("unknown captcha provider: %s", provider)}
	}

	// Build form data
	data := url.Values{
		"secret":   {secretKey},
		"response": {token},
	}
	if remoteIP != "" {
		data.Set("remoteip", remoteIP)
	}

	resp, err := v.httpClient.PostForm(endpoint, data)
	if err != nil {
		log.Error().Err(err).Str("provider", provider).Msg("CAPTCHA verification request failed")
		return &CaptchaResult{Success: false, Error: "captcha verification request failed"}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &CaptchaResult{Success: false, Error: "failed to read captcha response"}
	}

	var result struct {
		Success    bool     `json:"success"`
		ErrorCodes []string `json:"error-codes"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		log.Error().Err(err).Str("provider", provider).Str("body", string(body)).Msg("Failed to parse CAPTCHA response")
		return &CaptchaResult{Success: false, Error: "invalid captcha response format"}
	}

	if !result.Success {
		errorMsg := "captcha verification failed"
		if len(result.ErrorCodes) > 0 {
			errorMsg = fmt.Sprintf("captcha failed: %v", result.ErrorCodes)
		}
		log.Info().Str("provider", provider).Strs("errors", result.ErrorCodes).Msg("CAPTCHA verification failed")
		return &CaptchaResult{Success: false, Error: errorMsg}
	}

	return &CaptchaResult{Success: true}
}
