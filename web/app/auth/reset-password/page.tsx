"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      // 2. Check if a PKCE code exists in the query parameters
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session) {
            setHasRecoverySession(true);
            setCheckingSession(false);
            return;
          }
        }
      }

      // 3. Fallback to active session check
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          setHasRecoverySession(false);
          setErrorMessage("Invalid or expired password reset link. Please request a new recovery link.");
        } else {
          setHasRecoverySession(true);
        }
      } catch {
        setHasRecoverySession(false);
        setErrorMessage("Unable to verify recovery session. Please try again.");
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
        setSuccessMessage("Password successfully updated! Redirecting to workspace...");
        setTimeout(() => {
          window.location.href = "/";
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
      }}
    >
      <div
        className="glass-panel glow-indigo"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "2.5rem 2.25rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              marginBottom: "0.4rem",
            }}
          >
            RY<span className="gradient-text">VIX</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
            Security Credential Recovery
          </p>
        </div>

        {errorMessage && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.88rem",
              marginBottom: "1.25rem",
              lineHeight: 1.4,
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              color: "#6ee7b7",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "0.88rem",
              marginBottom: "1.25rem",
              lineHeight: 1.4,
            }}
          >
            {successMessage}
          </div>
        )}

        {checkingSession ? (
          <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)" }}>
            <span className="pulse-dot" style={{ background: "#6366f1", marginRight: "0.5rem" }}></span>
            Validating recovery token...
          </div>
        ) : hasRecoverySession ? (
          <form onSubmit={handlePasswordUpdate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label
                htmlFor="new-password"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "0.4rem",
                }}
              >
                New Password (min 6 characters)
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoFocus
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "0.4rem",
                }}
              >
                Confirm New Password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <span className="pulse-dot" style={{ background: "#ffffff" }}></span>
                  Updating Password...
                </>
              ) : (
                "Update Password & Enter"
              )}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <a
              href="/login"
              className="btn-secondary"
              style={{ display: "inline-block", textDecoration: "none", width: "100%", textAlign: "center" }}
            >
              Return to Sign In
            </a>
          </div>
        )}

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
          }}
        >
          <span className="pulse-dot"></span>
          <span>Secured by Supabase Auth with Row Level Security</span>
        </div>
      </div>
    </div>
  );
}
