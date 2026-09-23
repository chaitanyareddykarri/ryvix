# Ryvix Authentication & Multi-Tenant Authorization Architecture

## 1. Executive Summary

Ryvix enforces a deterministic, defense-in-depth authentication and authorization architecture. Authentication is managed securely via **Supabase Auth (GoTrue)** with `@supabase/ssr` cookie persistence, while authorization and tenant isolation are enforced at the database kernel level through **PostgreSQL Row Level Security (RLS)**.

All legacy email-confirmation links, magic links, clickable confirmation URLs, and URL callback code exchanges have been removed. Ryvix implements dedicated, secure authentication flows:
1. **Flow A — New Account Creation (Sign Up)**: Full Name, Email, Password -> 6-digit numeric Email OTP -> Verification -> Database Trigger Provisioning -> Direct Dashboard Redirect.
2. **Flow B — Returning User Sign In**: Email + Password -> Direct `signInWithPassword()` -> Secure SSR Session Cookies -> Dashboard.
3. **Flow C — Forgot Password / Recovery**: Email -> 6-digit Recovery Code -> New Password -> Return to Sign In.

---

## 2. Authentication Lifecycle Overview

### Flow A: New User Onboarding
```text
[ New User: Create Account ]
       │
       │  1. Input: Full Name, Email, Password, Confirm Password
       │  2. Strict Validation (Email regex, Password length >= 6, Match check)
       ▼
[ Signup Step 1 API (/api/auth/signup/step1) ]
       │
       │  3. Pre-checks duplicate email in auth.users
       │  4. Generates genuine cryptographically random 6-digit OTP
       │  5. Dispatches branded transactional email via Resend API
       │  6. Sets AES-256-GCM encrypted challenge cookie (ryvix_signup_challenge, 10 min TTL)
       ▼
[ Dedicated 6-Digit Email OTP Screen ]
       │
       │  7. User enters 6-digit numeric OTP code
       │  8. Live 45s resend rate-limit countdown
       │  9. "Change Email" option to correct typos without losing name
       ▼
[ Signup Step 2 API (/api/auth/signup/step2) ]
       │
       │  10. Decrypts & validates OTP from challenge cookie
       │  11. Inserts confirmed user into auth.users (email_confirmed_at: NOW())
       │  12. PostgreSQL Trigger (handle_new_user):
       │        ├── Provisions personal Tenant Organization (public.organizations)
       │        ├── Provisions User Profile with 'owner' role (public.profiles)
       │        └── Syncs membership record (public.organization_members)
       │  13. Establishes genuine Supabase session cookies (sb-*-auth-token)
       ▼
[ Protected Ryvix Dashboard (/dashboard) ]
```

### Flow B: Returning User Sign In
```text
[ Returning User: Sign In ]
       │
       │  1. Input: Email, Password
       ▼
[ Supabase Auth (signInWithPassword) ]
       │
       │  2. Validates credentials securely against auth.users bcrypt hash
       │  3. Issues JWT Access Token (1 hour) & Refresh Token (7 days)
       │  4. Stores session tokens in HTTP-only cookies via @supabase/ssr
       ▼
[ Protected Ryvix Dashboard (/dashboard) ]
```

### Flow C: Forgot Password & Recovery
```text
[ Forgot Password Screen ]
       │
       │  1. Input: Email
       │  2. supabase.auth.resetPasswordForEmail()
       ▼
[ 6-Digit Recovery Verification ]
       │
       │  3. User enters 6-digit recovery code from email
       │  4. supabase.auth.verifyOtp({ email, token, type: 'recovery' })
       ▼
[ Reset Password Screen ]
       │
       │  5. Input: New Password & Confirm Password (min 6 chars)
       │  6. supabase.auth.updateUser({ password: newPassword })
       │  7. Signs out recovery session cleanly
       ▼
[ Return to Sign In Screen with Success Notice ]
```

---

## 3. UI State Machine & Authoritative Auth Mode

The frontend at `web/app/login/page.tsx` implements a single source-of-truth state machine:

```typescript
type AuthMode =
  | "signin"
  | "signup"
  | "signup-otp"
  | "forgot"
  | "recovery-otp"
  | "reset-password"
  | "reset-success";
```

### Tab Switcher Synchronization
The Sign In and Create Account tabs are rendered as a single unified component that derives active styling directly from `mode`:
- When `mode === "signin"`: The **Sign In** tab is active; only the login form is rendered.
- When `mode === "signup"`: The **Create Account** tab is active; only the registration form is rendered.
- When `mode === "signup-otp"`: The dedicated 6-digit OTP verification card is rendered with action buttons:
  - **Verify Email →**: Submits OTP and provisions the workspace.
  - **Resend Code**: Live 45-second rate-limiting countdown.
  - **Change Email**: Returns to the signup form preserving Full Name and Email while safely wiping sensitive password fields.
  - **← Back to Sign In**: Switches back to the login view.

---

## 4. Password Security & Storage Architecture

1. **Zero Application Password Storage**: Ryvix application tables (`public.*`) never store plaintext passwords or password hashes.
2. **Supabase Auth Managed**: All passwords reside strictly within `auth.users`, hashed with Blowfish crypt (`bf` / bcrypt) with individual salts.
3. **No Password Logging**: Application logs, server error handlers, and client diagnostics are strictly forbidden from logging passwords or credentials.

---

## 5. Database Provisioning Trigger (`handle_new_user`)

When a user is confirmed in `auth.users`, the PostgreSQL trigger `on_auth_user_created` fires `AFTER INSERT`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
DECLARE
    new_org_id UUID;
    clean_name TEXT;
    clean_slug TEXT;
BEGIN
    clean_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'User');
    clean_slug := 'org-' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 12);

    -- 1. Idempotently create personal workspace organization
    INSERT INTO public.organizations (name, slug)
    VALUES (clean_name || '''s Workspace', clean_slug)
    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO new_org_id;

    -- 2. Idempotently create profile
    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (NEW.id, new_org_id, clean_name, 'owner')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW();

    -- 3. Link organization membership
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user error: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Session Handling & SSR Cookie Persistence

1. **Tokens**:
   - **Access Token (JWT)**: 3,600 seconds (1 hour).
   - **Refresh Token**: 604,800 seconds (7 days rolling).
2. **Next.js Middleware (`web/middleware.ts`)**:
   - Runs `updateSession(request)` on every route request.
   - Evaluates `supabase.auth.getUser()`.
   - Automatically rotates tokens seamlessly when nearing expiry.
   - Redirects unauthenticated requests away from protected routes (`/dashboard`, `/servers`, `/tasks`, `/chat`) to `/login`.
   - Redirects authenticated users away from `/login` directly to `/dashboard`.

---

## 7. Email Dispatch & SMTP Provider

- **Transactional Email Provider**: Direct integration with Resend API (`RESEND_API_KEY`).
- **Templates**: Branded cyber-themed HTML template containing a high-visibility numeric 6-digit OTP box.
- **Rate Limiting**: 45-second client-side and server-side cooldown on OTP resend requests.
- **Fail-safe Logging**: Detailed error tracking on the server (status codes, provider error payloads) without exposing internal technical details to the browser.
