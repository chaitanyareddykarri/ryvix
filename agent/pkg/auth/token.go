package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type EnrollmentPayload struct {
	Env string `json:"env"`
	Exp int64  `json:"exp"`
}

// GenerateEnrollmentToken creates a cryptographically signed enrollment token.
func GenerateEnrollmentToken(envID, secret string, validHours int) (string, error) {
	if envID == "" || secret == "" {
		return "", errors.New("environmentID and secret are required")
	}
	expiresAt := time.Now().Add(time.Duration(validHours) * time.Hour).UnixMilli()
	payloadObj := EnrollmentPayload{
		Env: envID,
		Exp: expiresAt,
	}

	payloadJSON, err := json.Marshal(payloadObj)
	if err != nil {
		return "", err
	}

	payloadBase64 := base64.RawURLEncoding.EncodeToString(payloadJSON)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payloadBase64))
	sigBase64 := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return fmt.Sprintf("ryvix_enr_%s.%s", payloadBase64, sigBase64), nil
}

// VerifyEnrollmentToken validates the HMAC-SHA256 signature and expiration timestamp.
func VerifyEnrollmentToken(token, secret string) (bool, string, error) {
	// Format A: ryvix_enr_<base64payload>.<base64sig>
	if strings.HasPrefix(token, "ryvix_enr_") {
		raw := strings.TrimPrefix(token, "ryvix_enr_")
		parts := strings.Split(raw, ".")
		if len(parts) != 2 {
			return false, "", errors.New("malformed enrollment token structure")
		}

		payloadBase64 := parts[0]
		providedSig := parts[1]

		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(payloadBase64))
		expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

		if !hmac.Equal([]byte(providedSig), []byte(expectedSig)) {
			return false, "", errors.New("cryptographic signature mismatch: unauthorized token")
		}

		payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadBase64)
		if err != nil {
			return false, "", errors.New("invalid base64 payload")
		}

		var payload EnrollmentPayload
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			return false, "", errors.New("invalid JSON payload inside token")
		}

		if time.Now().UnixMilli() > payload.Exp {
			return false, payload.Env, errors.New("enrollment token has expired")
		}

		return true, payload.Env, nil
	}

	// Format B: envId.expiresAtMs.signatureHex
	parts := strings.Split(token, ".")
	if len(parts) == 3 {
		envID := parts[0]
		expiresAtStr := parts[1]
		providedSig := parts[2]

		expiresAt, err := strconv.ParseInt(expiresAtStr, 10, 64)
		if err != nil {
			return false, "", errors.New("invalid expiration timestamp in token")
		}

		if time.Now().UnixMilli() > expiresAt {
			return false, envID, errors.New("enrollment token has expired")
		}

		payload := fmt.Sprintf("%s.%s", envID, expiresAtStr)
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(payload))
		expectedSig := hex.EncodeToString(mac.Sum(nil))

		if !hmac.Equal([]byte(providedSig), []byte(expectedSig)) {
			return false, envID, errors.New("cryptographic signature mismatch: unauthorized token")
		}

		return true, envID, nil
	}

	return false, "", errors.New("unrecognized token format")
}
