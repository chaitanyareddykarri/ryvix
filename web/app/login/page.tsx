"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  // UI state
  const [otpSent, setOtpSent] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "auth_callback_failed") {
        setErrorMessage("Confirmation link expired or invalid. Please request a new link.");
      } else if (params.get("verified") === "true") {
        setSuccessMessage("Email verified successfully! You may now sign in.");
      }
    }
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  function switchMode(newMode: "signin" | "signup" | "forgot") {
    setMode(newMode);
    setErrorMessage("");
    setSuccessMessage("");
    setIsAlreadyRegistered(false);
    setOtpSent(false);
    setForgotSent(false);
    setOtp("");
  }

  // Sign in with Email & Password
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMessage("Your email has not been verified yet. Please check your inbox for the confirmation link.");
        } else if (error.message.toLowerCase().includes("invalid login credentials")) {
          setErrorMessage("Invalid email or password. Please verify your credentials or use Forgot Password.");
        } else {
          setErrorMessage(error.message);
        }
      } else if (data.session) {
        setSuccessMessage("Signed in successfully. Redirecting to workspace...");
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  // Sign up with Email & Password
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
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
      const siteUrl = window.location.origin;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("user_already_exists")
        ) {
          setIsAlreadyRegistered(true);
          setErrorMessage("");
        } else {
          setErrorMessage(error.message);
        }
      } else if (data.session) {
        setSuccessMessage("Account created successfully! Redirecting to workspace...");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else if (data.user) {
        // Supabase returns empty identities array when user already exists & is confirmed
        if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          setIsAlreadyRegistered(true);
          setErrorMessage("");
          return;
        }
        setSuccessMessage(
          `Confirmation email sent to ${email.trim()}! Please open your email and click the confirmation link to complete registration.`
        );
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  // Forgot Password flow
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const siteUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setForgotSent(true);
        setSuccessMessage(
          `Password reset instructions dispatched to ${email.trim()}! Please check your inbox and tap the recovery link.`
        );
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to dispatch password recovery email.");
    } finally {
      setLoading(false);
    }
  }

  // Passwordless magic link / OTP flow
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const siteUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${siteUrl}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setOtpSent(true);
        setResendCountdown(60);
        setSuccessMessage(
          `Verification dispatched to ${email.trim()}! Click the confirmation link in your email to sign in directly, or enter your 6-digit code below if provided.`
        );
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to send login email.");
    } finally {
      setLoading(false);
    }
  }

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
        setSuccessMessage("Authentication verified! Redirecting to workspace...");
        setTimeout(() => {
          window.location.href = "/";
        }, 800);
      } else {
        setErrorMessage("Verification completed but no active session was returned.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to verify code.");
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
          maxWidth: "480px",
          padding: "2.5rem 2.25rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
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

        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
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

        {/* Mode Switcher Tabs */}
        {mode !== "forgot" ? (
          <div
            style={{
              display: "flex",
              background: "rgba(15, 23, 42, 0.8)",
              borderRadius: "8px",
              padding: "4px",
              marginBottom: "1.5rem",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <button
              type="button"
              onClick={() => switchMode("signin")}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: "6px",
                border: "none",
                background: mode === "signin" ? "rgba(99, 102, 241, 0.3)" : "transparent",
                color: mode === "signin" ? "#ffffff" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: "6px",
                border: "none",
                background: mode === "signup" ? "rgba(99, 102, 241, 0.3)" : "transparent",
                color: mode === "signup" ? "#ffffff" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Reset Password</h2>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              style={{ background: "none", border: "none", color: "#818cf8", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline" }}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {isAlreadyRegistered && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.45)",
              borderRadius: "8px",
              padding: "0.9rem 1rem",
              marginBottom: "1.25rem",
              color: "#fef3c7",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "1.1rem" }}>âš ï¸ </span>
              <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#fbbf24" }}>
                Account Already Registered
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#e2e8f0", margin: "0 0 0.75rem 0", lineHeight: 1.4 }}>
              An account with <strong>{email}</strong> is already registered and confirmed. You do not need to create it again.
            </p>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                style={{
                  background: "#6366f1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                Sign In Now â†’
              </button>
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                style={{
                  background: "transparent",
                  color: "#94a3b8",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  borderRadius: "6px",
                  padding: "0.45rem 0.9rem",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Reset Password
              </button>
            </div>
          </div>
        )}

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

        {/* TAB 1: SIGN IN */}
        {mode === "signin" && (
          <div>
            {authMethod === "password" ? (
              <form onSubmit={handlePasswordSignIn} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div>
                  <label
                    htmlFor="signin-email"
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    id="signin-email"
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

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label
                      htmlFor="signin-password"
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#818cf8",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="signin-password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    disabled={loading}
                  />
                </div>

                <button type="submit" disabled={loading || !email.trim() || !password} className="btn-primary">
                  {loading ? (
                    <>
                      <span className="pulse-dot" style={{ background: "#ffffff" }}></span>
                      Signing In...
                    </>
                  ) : (
                    "Sign In with Password"
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("otp");
                      setErrorMessage("");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#818cf8",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Or sign in with passwordless Magic Link / OTP
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                    <div>
                      <label
                        htmlFor="otp-email"
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                          color: "var(--text-secondary)",
                          marginBottom: "0.4rem",
                        }}
                      >
                        Email Address
                      </label>
                      <input
                        id="otp-email"
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
                          Sending Email...
                        </>
                      ) : (
                        "Send Magic Link / OTP"
                      )}
                    </button>

                    <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("password");
                          setErrorMessage("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#818cf8",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Back to password sign in
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                    <div style={{ background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.25)", padding: "0.85rem", borderRadius: "8px", fontSize: "0.84rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                      <strong>Tip:</strong> If your email contains a <strong>&quot;Confirm email address&quot;</strong> link, simply tap the link on your phone/browser to log in automatically! If it contains a 6-digit code, enter it below:
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <label
                          htmlFor="otp-code"
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 500,
                            color: "var(--text-secondary)",
                          }}
                        >
                          6-Digit Verification Code (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
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
                          Change email
                        </button>
                      </div>

                      <input
                        id="otp-code"
                        type="text"
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
                          Verifying Code...
                        </>
                      ) : (
                        "Verify & Sign In"
                      )}
                    </button>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                      <button
                        type="button"
                        disabled={resendCountdown > 0 || loading}
                        onClick={handleSendOtp}
                        className="btn-secondary"
                        style={{ fontSize: "0.82rem", padding: "0.45rem 0.8rem" }}
                      >
                        {resendCountdown > 0 ? `Resend email in ${resendCountdown}s` : "Resend Email"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("password");
                          setOtpSent(false);
                          setErrorMessage("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#818cf8",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Use password instead
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SIGN UP */}
        {mode === "signup" && (
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <label
                htmlFor="signup-name"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "0.4rem",
                }}
              >
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoFocus
                placeholder="Chaitanya Reddy"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="signup-email"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "0.4rem",
                }}
              >
                Work Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                required
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "0.4rem",
                }}
              >
                Password (min 6 characters)
              </label>
              <input
                id="signup-password"
                type="password"
                required
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
                htmlFor="signup-confirm-password"
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "0.4rem",
                }}
              >
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
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
              disabled={loading || !email.trim() || !password || !confirmPassword}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <span className="pulse-dot" style={{ background: "#ffffff" }}></span>
                  Creating Account &amp; Workspace...
                </>
              ) : (
                "Create Ryvix Account"
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#818cf8",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {mode === "forgot" && (
          <div>
            {!forgotSent ? (
              <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Enter your registered work email address and we will dispatch a cryptographically signed recovery link.
                </p>

                <div>
                  <label
                    htmlFor="forgot-email"
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Work Email Address
                  </label>
                  <input
                    id="forgot-email"
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
                      Sending Reset Link...
                    </>
                  ) : (
                    "Send Password Reset Link"
                  )}
                </button>

                <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#818cf8",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Remember your password? Sign in
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                  We have dispatched a password recovery email to <strong>{email}</strong>. Open the link to create a new password.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="btn-secondary"
                  style={{ width: "100%" }}
                >
                  Return to Sign In
                </button>
              </div>
            )}
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
