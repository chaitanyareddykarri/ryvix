"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"enter_email" | "enter_otp">("enter_email");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const supabase = createClient();

  // Resend countdown timer effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // Step 1: Send OTP to email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setStep("enter_otp");
        setResendCountdown(60);
        setSuccessMessage(`A 6-digit verification code was dispatched to ${email.trim()}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch verification code.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify 6-digit OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (data.session) {
        setSuccessMessage("Authentication successful. Redirecting to workspace console...");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        setErrorMessage("Verification completed but no active session was returned.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify code.";
      setErrorMessage(msg);
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
        {/* Subtle decorative glow */}
        <div
          style={{
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Brand Header */}
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
            Autonomous Software &amp; Infrastructure Operations Platform
          </p>
        </div>

        {/* Feedback Banners */}
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

        {/* Step 1: Enter Email */}
        {step === "enter_email" && (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                }}
              >
                Work Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading || !email.trim()} className="btn-primary">
              {loading ? (
                <>
                  <span className="pulse-dot" style={{ background: "#ffffff" }}></span>
                  Sending Security Code...
                </>
              ) : (
                "Send Verification Code"
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                A passwordless 6-digit one-time code will be dispatched to your inbox.
              </p>
            </div>
          </form>
        )}

        {/* Step 2: Enter 6-Digit OTP */}
        {step === "enter_otp" && (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label
                  htmlFor="otp"
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  Enter 6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("enter_email");
                    setOtp("");
                    setErrorMessage("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#818cf8",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Edit email
                </button>
              </div>

              <input
                id="otp"
                type="text"
                required
                autoFocus
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="input-field input-otp"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading || otp.length < 6} className="btn-primary">
              {loading ? (
                <>
                  <span className="pulse-dot" style={{ background: "#ffffff" }}></span>
                  Verifying Token...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <button
                type="button"
                disabled={resendCountdown > 0 || loading}
                onClick={handleSendOtp}
                className="btn-secondary"
                style={{ fontSize: "0.82rem", padding: "0.45rem 0.8rem" }}
              >
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend Code"}
              </button>

              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Valid for 10 minutes
              </span>
            </div>
          </form>
        )}

        {/* Security Assurance Footer */}
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
