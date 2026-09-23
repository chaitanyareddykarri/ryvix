package auth

import (
	"testing"
)

func TestTokenLifecycle(t *testing.T) {
	secret := "ryvix_demo_enrollment_secret_key_2026"
	envID := "env_prod_ecommerce"

	// 1. Format A: ryvix_enr_
	tokenA, err := GenerateEnrollmentToken(envID, secret, 24)
	if err != nil {
		t.Fatalf("GenerateEnrollmentToken failed: %v", err)
	}

	validA, parsedEnvA, errA := VerifyEnrollmentToken(tokenA, secret)
	if errA != nil || !validA {
		t.Fatalf("VerifyEnrollmentToken failed for Format A: %v", errA)
	}
	if parsedEnvA != envID {
		t.Fatalf("Expected env %s, got %s", envID, parsedEnvA)
	}

	// 2. Format B: dot format
	tokenB := "env_prod_ecommerce.9999999999999.dummy"
	// test tampered
	validB, _, _ := VerifyEnrollmentToken(tokenB, secret)
	if validB {
		t.Fatalf("Expected fake signature to fail")
	}
}
