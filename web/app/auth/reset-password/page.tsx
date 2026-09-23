"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // 1. Listen for Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
        setCheckingSession(false);
        setErrorMessage("");
      }
    });

    async function checkSession() {
      // Direct session check: only authorized if 6-digit recovery OTP was verified
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setHasRecoverySession(false);
          setErrorMessage("No active recovery authorization found. Please request a 6-digit verification code to reset your password.");
        } else {
          setHasRecoverySession(true);
        }
      } catch {
        setHasRecoverySession(false);
        setErrorMessage("Unable to verify recovery authorization. Please try again.");
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        // Sign out recovery session so user logs in cleanly with new credentials
        await supabase.auth.signOut();
        setSuccessMessage("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          window.location.href = "/login?reset=success";
        }, 1200);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "radial-gradient(ellipse at top, #0f172a 0%, #030712 70%)",
        color: "var(--text-primary, #f8fafc)",
        position: "relative",
      }}
    >
      <div
        className="glass-panel glow-indigo"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "2.5rem 2.25rem",
          position: "relative",
          overflow: "hidden",
          borderRadius: "16px",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(99, 102, 241, 0.28)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              marginBottom: "0.3rem",
            }}
          >
            RY<span className="gradient-text" style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VIX</span>
          </h1>
          <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.88rem" }}>
            Autonomous Software &amp; Infrastructure Operations Platform
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "#fca5a5",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "#6ee7b7",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {checkingSession ? (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8" }}>
            Verifying recovery session...
          </div>
        ) : hasRecoverySession ? (
          <div>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.4rem" }}>
                Set New Password
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                Enter your new account password below.
              </p>
            </div>

            <form onSubmit={handlePasswordUpdate}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "#cbd5e1" }}>
                  New Password (min 6 characters)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-field"
                    style={{ paddingRight: "2.5rem" }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "1.4rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "#cbd5e1" }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-field"
                    style={{ paddingRight: "2.5rem" }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="btn-primary btn-shimmer"
                style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem", fontWeight: 700 }}
              >
                {loading ? "Updating Password..." : "Update Password →"}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Please request a password reset code from the login page.
            </p>
            <Link
              href="/login"
              className="btn-primary btn-shimmer"
              style={{ display: "inline-block", padding: "0.75rem 1.5rem", textDecoration: "none" }}
            >
              Return to Login →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
