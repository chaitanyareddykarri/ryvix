# Ryvix Authentication & Multi-Tenant Authorization Architecture (100% 6-Digit Email OTP)

## 1. Executive Summary

Ryvix enforces a deterministic, defense-in-depth authentication and authorization architecture. Authentication is managed securely via **Supabase Auth (GoTrue)** with `@supabase/ssr` cookie persistence, while authorization and tenant isolation are enforced at the database kernel level through **PostgreSQL Row Level Security (RLS)**.

All legacy email-confirmation links, magic links, clickable confirmation URLs, and URL callback code exchanges have been completely removed. Ryvix requires **6-digit email OTP verification** across all three primary authentication flows:
1. **Flow A —� New Account Creation (Sign Up)**
2. **Flow B —� Existing Account Login**
3. **Flow C —� Forgot Password / Password Recovery**

---

## 2. Authentication Lifecycle Overview

```text
[ Unregistered User ]
       │
       │  1. Registration (Full Name, Work Email, Password, Confirm Password)
       ▼
[ Supabase Auth (auth.users) ]
       │
       ├──> PostgreSQL Trigger (handle_new_user)
       │     ├──> Idempotently provisions personal Tenant Organization (public.organizations)
       │     ├──> Provisions User Profile with 'owner' role (public.profiles)
       │     └──> Syncs membership record (public.organization_members)
       │
       │  2. 6-Digit Email OTP Dispatched (type: 'signup')
       ▼
[ 6-Digit Email OTP Screen ]
       │
       │  3. User enters numeric code inside Ryvix UI
       │  4. verifyOtp({ email, token, type: 'signup' })
       ▼
[ Account & Email Confirmed ]
       │
       │  5. Redirects user cleanly to Login (no auto-bypass)
       ▼
[ Flow B: Standard 2-Step Login with Email OTP ]
       │
       │  6. Validates credentials + Dispatches 6-digit login OTP
       │  7. verifyOtp({ email, token, type: 'email' })
       ▼
[ Authenticated SSR Session ]
       │
       │  8. Encrypted HTTP-Only Session Cookies (@supabase/ssr)
       ▼
[ Protected Workspace Console (/dashboard) ]
```

---

## 3. The Three Distinct Authentication Flows

### Flow A —� New Account Creation (Sign Up)
- **Endpoint**: `/login` (Tab: "Create Account")
- **Fields**: Full Name, Work Email, Password (min 6 chars), Confirm Password.
- **API Call**: `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
- **OTP Verification**: `supabase.auth.verifyOtp({ email, token, type: 'signup' })`.
- **Post-Verification**:
  - Supabase Auth marks user's `email_confirmed_at` timestamp.
  - The UI presents a clean success message: *"Email verified successfully. Your Ryvix account has been created."*
  - The user continues to Login. No unverified user can access the application.

### Flow B —� Existing Account Login
- **Endpoint**: `/login` (Tab: "Sign In")
- **Step 1 (Credential Validation)**:
  - User submits Email + Password.
  - POST `/api/auth/login/step1` validates credentials using a stateless server client without emitting session cookies.
  - On valid credentials, dispatches a 6-digit email OTP via `signInWithOtp({ email, options: { shouldCreateUser: false } })` and returns a signed, HTTP-only challenge cookie.
  - On invalid credentials, immediately returns generic `401 Unauthorized: Invalid email or password.` (account enumeration prevented).
- **Step 2 (Login OTP Verification)**:
  - User enters 6-digit code on the interactive OTP screen.
  - POST `/api/auth/login/step2` validates the challenge cookie and verifies the code via `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
  - On verification success, writes genuine encrypted `@supabase/ssr` HTTP-only session cookies and clears the challenge cookie.
  - Direct access to `/dashboard` before Step 2 completion is strictly denied by server middleware.

### Flow C —� Forgot Password & Recovery
- **Endpoint**: `/login` (Mode: "Forgot password?")
- **Recovery OTP Dispatch**:
  - User enters registered email address.
  - Calls `supabase.auth.resetPasswordForEmail(email)` without redirect URLs.
  - Displays neutral message: *"If an account exists for this email, a verification code has been sent."*
- **Recovery OTP Verification**:
  - User enters 6-digit code into the recovery OTP screen.
  - Calls `supabase.auth.verifyOtp({ email, token, type: 'recovery' })`.
  - Establishes genuine temporary recovery session authorizing password changes.
- **Password Reset**:
  - User sets New Password and Confirm Password.
  - Calls `supabase.auth.updateUser({ password })`.
  - Signs out recovery session cleanly and redirects user to sign in with their new credentials.

---

## 4. Legacy Architecture Removal & Security Boundaries

1. **Clickable Links Removed**: The legacy URL callback route `/auth/callback` has been completely deleted. Any access to `/auth/callback` returns 404 and is blocked from public bypass.
2. **URL Tokens Eliminated**: Query parameters like `?code=`, `?token=`, and `#type=recovery` are completely ignored and cannot trigger session creation or bypass OTP screens.
3. **Defense-in-Depth Route Middleware**:
   - `web/utils/supabase/middleware.ts` guards all routes with `@supabase/ssr`.
   - Public routes are strictly restricted to `/` (marketing landing), `/login`, and `/auth/reset-password`.
   - `/dashboard`, `/servers`, `/tasks`, `/chat`, and all protected APIs require an authenticated Supabase session.
4. **Brute Force & Rate Limiting**:
   - 45-second cooldown timer enforced on all OTP resend actions.
   - Server-side rate limit guards against rapid repeat dispatches.
   - Challenge cookies are cryptographically signed with HMAC-SHA256 and expire in 10 minutes.
---

## 6. Cyberpunk Visual Design & Dynamic 3D Animations

The authentication console (`/login`) incorporates an interactive, high-performance visual experience:

1. **Interactive 3D Moving Blocks (`MovingBlocks3D`)**:
   - Rendered using Three.js with dynamic client-side mounting (`next/dynamic` with `{ ssr: false }`).
   - Floats glowing wireframe geometric blocks in 3D space with subtle mouse-driven parallax tracking.
2. **Atmospheric Lighting & Grid Overlay**:
   - Multi-point ambient and directional cyan/violet spotlights.
   - High-tech cyber-grid canvas with subtle radial depth masking.
3. **Card & Button Micro-Animations**:
   - `.login-card-animated`: Smooth entrance translation with interactive cyan-indigo border glow pulsing (`animation: loginBorderGlow 6s ease-in-out infinite`).
   - `.login-tab-btn`: Smooth active tab switching with hardware-accelerated cubic-bezier transitions.
   - `.btn-login-submit`: Multi-stop gradient fill with animated hover arrow icon and click ripple effect.
