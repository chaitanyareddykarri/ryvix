"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import OtpInput6 from "@/components/OtpInput6";
import dynamic from "next/dynamic";
const MovingBlocks3D = dynamic(() => import("@/components/MovingBlocks3D"), { ssr: false });
import { maskEmail } from "@/utils/auth-security";

type AuthMode =
  | "signin"
  | "signup"
  | "signup-otp"
  | "forgot"
  | "recovery-otp"
  | "reset-password"
  | "reset-success";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // 1. Listen for Supabase recovery auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset-password");
        setErrorMessage("");
        setSuccessMessage("Identity verified! Please set your new password below.");
      }
    });

    // 2. Handle clean redirect notices (e.g. after password reset)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "success") {
        setSuccessMessage("Password reset successfully! Please sign in with your new password.");
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setErrorMessage("");
    setSuccessMessage("");
    setInfoMessage("");
    setOtp("");
    if (newMode === "signin") {
      setPassword("");
      setConfirmPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  }

  // ==========================================
  // RETURNING USER: SIGN IN FLOW
  // Email + Password -> signInWithPassword -> Session -> /dashboard
  // ==========================================
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setInfoMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        console.warn("[Sign In Result]:", error.message, "status:", error.status);
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
          setErrorMessage("Invalid email or password.");
        } else if (msg.includes("email not confirmed")) {
          setErrorMessage("Please verify your email address before signing in.");
        } else if (msg.includes("rate limit") || msg.includes("too many requests")) {
          setErrorMessage("Too many attempts. Please wait a moment and try again.");
        } else {
          setErrorMessage(error.message || "Sign-in failed. Please try again.");
        }
        return;
      }

      if (data.session) {
        setSuccessMessage("Authentication successful! Entering workspace...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      }
    } catch (err: unknown) {
      console.error("[Sign In Exception]:", err);
      setErrorMessage("Sign-in failed. Please check your network connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // NEW USER: CREATE ACCOUNT FLOW
  // Full Name, Email, Password -> Step 1 -> 6-Digit Email OTP
  // ==========================================
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName) {
      setErrorMessage("Full name is required.");
      return;
    }

    if (!cleanEmail) {
      setErrorMessage("Email address is required.");
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (!confirmPassword) {
      setErrorMessage("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setInfoMessage("");

    try {
      const res = await fetch("/api/auth/signup/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          fullName: cleanName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn("[Signup Step 1 Notice]:", data);
        setErrorMessage(data.error || "Failed to create account. Please try again.");
        return;
      }

      // Account created & OTP dispatched -> transition to 6-digit OTP verification screen
      setMaskedEmail(data.maskedEmail || maskEmail(cleanEmail));
      setOtp("");
      setResendCountdown(45);
      setMode("signup-otp");
    } catch (err: unknown) {
      console.error("[Signup Step 1 Exception]:", err);
      setErrorMessage("Registration request failed. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // NEW USER: OTP VERIFICATION
  // User enters 6-digit OTP -> Verify -> Provision -> Session -> /dashboard
  // ==========================================
  async function handleSignupOtpSubmit(e?: React.FormEvent | string) {
    if (typeof e !== "string" && e) e.preventDefault();
    if (loading) return;

    const cleanOtp = typeof e === "string" ? e : otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/auth/signup/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn("[Signup Step 2 Notice]:", data);
        setErrorMessage(data.error || "The verification code is incorrect. Please try again.");
        return;
      }

      setSuccessMessage("Email verified successfully! Setting up your workspace...");
      setTimeout(() => {
        window.location.href = data.redirect || "/dashboard";
      }, 700);
    } catch (err: unknown) {
      console.error("[Signup Step 2 Exception]:", err);
      setErrorMessage("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendSignupOtp() {
    if (resendCountdown > 0 || loading) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/auth/signup/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to resend code. Please try again.");
        return;
      }

      setResendCountdown(45);
      setSuccessMessage("A fresh 6-digit verification code has been dispatched to your email.");
    } catch {
      setErrorMessage("Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Change Email Action: returns to signup form with safe fields preserved
  function handleChangeEmail() {
    setMode("signup");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setErrorMessage("");
    setSuccessMessage("");
    setInfoMessage("");
  }

  // ==========================================
  // FORGOT PASSWORD & RECOVERY FLOW
  // ==========================================
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (error && !error.message.toLowerCase().includes("rate limit")) {
        console.warn("[Password Recovery Notice]:", error.message);
      }

      setMaskedEmail(maskEmail(cleanEmail));
      setOtp("");
      setResendCountdown(45);
      setInfoMessage("If an account exists for this email, a verification code has been sent.");
      setMode("recovery-otp");
    } catch {
      setMaskedEmail(maskEmail(cleanEmail));
      setOtp("");
      setResendCountdown(45);
      setInfoMessage("If an account exists for this email, a verification code has been sent.");
      setMode("recovery-otp");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecoveryOtpSubmit(e?: React.FormEvent | string) {
    if (typeof e !== "string" && e) e.preventDefault();
    if (loading) return;

    const cleanOtp = typeof e === "string" ? e : otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanOtp,
        type: "recovery",
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("expired")) {
          setErrorMessage("This verification code has expired. Please request a new code.");
        } else {
          setErrorMessage("The verification code is incorrect. Please try again.");
        }
        return;
      }

      setMode("reset-password");
      setSuccessMessage("Identity verified! Please set your new password below.");
    } catch {
      setErrorMessage("Recovery verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendRecoveryOtp() {
    if (resendCountdown > 0 || loading) return;
    setLoading(true);
    setErrorMessage("");

    try {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      setResendCountdown(45);
      setSuccessMessage("A fresh verification code has been dispatched.");
    } catch {
      setErrorMessage("Failed to resend recovery code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!newPassword || !confirmNewPassword) {
      setErrorMessage("Please complete both password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      await supabase.auth.signOut();
      setMode("reset-success");
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
        backgroundColor: "#030712",
        color: "var(--text-primary, #f8fafc)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 3D Animated Kinetic Moving Blocks Background */}
      <MovingBlocks3D density="normal" interactive={true} />

      {/* Cyber Grid Background Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: "36px 36px",
          backgroundPosition: "center center",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Atmospheric Ambient Glow Orbs */}
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "550px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(6, 182, 212, 0.12) 50%, transparent 70%)",
          filter: "blur(65px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        className="glass-panel glow-indigo login-card-animated"
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
          zIndex: 10,
        }}
      >
        {/* Glow orb */}
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

        {/* Global Feedback Banners */}
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

        {infoMessage && (
          <div
            style={{
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "#bae6fd",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>ℹ️</span>
            <span>{infoMessage}</span>
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

        {/* ======================================================== */}
        {/* AUTHORITATIVE TAB SWITCHER (SIGN IN vs CREATE ACCOUNT)   */}
        {/* ======================================================== */}
        {(mode === "signin" || mode === "signup") && (
          <div
            style={{
              display: "flex",
              background: "rgba(10, 15, 29, 0.75)",
              padding: "0.3rem",
              borderRadius: "10px",
              marginBottom: "1.5rem",
              border: "1px solid rgba(99, 102, 241, 0.25)",
            }}
          >
            <button
              type="button"
              id="tab-btn-signin"
              onClick={() => switchMode("signin")}
              className={`login-tab-btn ${mode === "signin" ? "active" : ""}`}
              style={{ flex: 1 }}
              disabled={loading}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-btn-signup"
              onClick={() => switchMode("signup")}
              className={`login-tab-btn ${mode === "signup" ? "active" : ""}`}
              style={{ flex: 1 }}
              disabled={loading}
            >
              Create Account
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: SIGN IN (RETURNING USER: EMAIL + PASSWORD)       */}
        {/* ======================================================== */}
        {mode === "signin" && (
          <div>
            <form onSubmit={handlePasswordSignIn}>
              <div style={{ marginBottom: "1.1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "#cbd5e1" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="login-input-field"
                  disabled={loading}
                />
              </div>

              <div style={{ marginBottom: "1.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1" }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38bdf8",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="login-input-field"
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
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="btn-login-submit"
              >
                <span>{loading ? "Signing in..." : "Sign In"}</span>
                {!loading && <span className="arrow-icon" style={{ fontSize: "1.1rem" }}>&rarr;</span>}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.82rem", color: "#94a3b8" }}>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                style={{ background: "none", border: "none", color: "#38bdf8", fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                Create one now
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: CREATE ACCOUNT (NEW USER SIGNUP FORM)            */}
        {/* ======================================================== */}
        {mode === "signup" && (
          <div>
            <form onSubmit={handleSignUp}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "#cbd5e1" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Chaitanya Reddy"
                  className="login-input-field"
                  disabled={loading}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "#cbd5e1" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="login-input-field"
                  disabled={loading}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "#cbd5e1" }}>
                  Password (min 6 characters)
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
                    className="login-input-field"
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
                    {showPassword ? "🙈" : "👁️"}
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
                    className="login-input-field"
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
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !fullName.trim() || !email.trim() || !password || !confirmPassword}
                className="btn-login-submit"
              >
                <span>{loading ? "Creating Account..." : "Create Account"}</span>
                {!loading && <span className="arrow-icon" style={{ fontSize: "1.1rem" }}>&rarr;</span>}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.82rem", color: "#94a3b8" }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                style={{ background: "none", border: "none", color: "#38bdf8", fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                Sign in
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: SIGNUP NUMERIC 6-DIGIT EMAIL OTP VERIFICATION   */}
        {/* ======================================================== */}
        {mode === "signup-otp" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.75rem",
                  fontSize: "1.3rem",
                }}
              >
                ✉️
              </div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.4rem" }}>
                Verify your email
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.4 }}>
                We sent a 6-digit verification code to:
                <br />
                <strong style={{ color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                  {maskedEmail || email}
                </strong>
              </p>
            </div>

            <form onSubmit={handleSignupOtpSubmit}>
              <OtpInput6
                value={otp}
                onChange={setOtp}
                onComplete={(val) => handleSignupOtpSubmit(val)}
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary btn-shimmer"
                style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem", fontWeight: 700, marginBottom: "1.25rem" }}
              >
                {loading ? "Verifying Email..." : "Verify Email →"}
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", color: "#94a3b8", padding: "0 0.5rem" }}>
              <div>
                {resendCountdown > 0 ? (
                  <span style={{ color: "#64748b", fontWeight: 600 }}>
                    Resend Code in {resendCountdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendSignupOtp}
                    disabled={loading}
                    style={{ background: "none", border: "none", color: "#38bdf8", fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={loading}
                  style={{ background: "none", border: "none", color: "#94a3b8", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                >
                  Change Email
                </button>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "1.25rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem" }}>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer" }}
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: FORGOT PASSWORD (EMAIL INPUT)                    */}
        {/* ======================================================== */}
        {mode === "forgot" && (
          <div>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.4rem" }}>
                Forgot your password?
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                Enter the email associated with your Ryvix account.
              </p>
            </div>

            <form onSubmit={handleForgotPassword}>
              <div style={{ marginBottom: "1.4rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "#cbd5e1" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="login-input-field"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-login-submit"
              >
                <span>{loading ? "Sending Recovery Code..." : "Send Verification Code"}</span>
                {!loading && <span className="arrow-icon" style={{ fontSize: "1.1rem" }}>&rarr;</span>}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer" }}
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: RECOVERY OTP VERIFICATION                        */}
        {/* ======================================================== */}
        {mode === "recovery-otp" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.75rem",
                  fontSize: "1.3rem",
                }}
              >
                🔑
              </div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.4rem" }}>
                Enter Recovery Code
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", lineHeight: 1.4 }}>
                Enter the 6-digit recovery code sent to:
                <br />
                <strong style={{ color: "#c084fc", fontFamily: "var(--font-mono)" }}>
                  {maskedEmail || email}
                </strong>
              </p>
            </div>

            <form onSubmit={handleRecoveryOtpSubmit}>
              <OtpInput6
                value={otp}
                onChange={setOtp}
                onComplete={(val) => handleRecoveryOtpSubmit(val)}
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary btn-shimmer"
                style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem", fontWeight: 700, marginBottom: "1.25rem" }}
              >
                {loading ? "Verifying Code..." : "Verify Code →"}
              </button>
            </form>

            <div style={{ textAlign: "center", fontSize: "0.82rem", color: "#94a3b8" }}>
              Didn&apos;t receive the code?{" "}
              {resendCountdown > 0 ? (
                <span style={{ color: "#64748b", fontWeight: 600 }}>
                  Resend Code in {resendCountdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendRecoveryOtp}
                  disabled={loading}
                  style={{ background: "none", border: "none", color: "#c084fc", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Resend Code
                </button>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: "1.25rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem" }}>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer" }}
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 6: RESET PASSWORD (NEW PASSWORD INPUT)               */}
        {/* ======================================================== */}
        {mode === "reset-password" && (
          <div>
            <div style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.4rem" }}>
                Reset Password
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                Set a new secure password for your account.
              </p>
            </div>

            <form onSubmit={handleResetPassword}>
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="login-input-field"
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
                    aria-label="Toggle new password visibility"
                  >
                    {showPassword ? "🙈" : "👁️"}
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
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="login-input-field"
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
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmNewPassword}
                className="btn-login-submit"
              >
                <span>{loading ? "Updating Password..." : "Reset Password"}</span>
                {!loading && <span className="arrow-icon" style={{ fontSize: "1.1rem" }}>&rarr;</span>}
              </button>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 7: RESET SUCCESS STATE                              */}
        {/* ======================================================== */}
        {mode === "reset-success" && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.2)",
                border: "2px solid #10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
                fontSize: "1.75rem",
                color: "#34d399",
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.5rem" }}>
              Password reset successfully.
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1.75rem" }}>
              Your password has been changed.
            </p>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="btn-primary btn-shimmer"
              style={{ width: "100%", padding: "0.85rem", fontSize: "0.95rem", fontWeight: 700 }}
            >
              Continue to Login →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
