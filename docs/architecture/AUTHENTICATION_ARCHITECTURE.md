# Ryvix Authentication & Multi-Tenant Authorization Architecture

## 1. Executive Summary

Ryvix enforces a deterministic, defense-in-depth authentication and authorization architecture. Authentication is managed securely via **Supabase Auth (GoTrue)** with `@supabase/ssr` cookie persistence, while authorization and tenant isolation are enforced at the database kernel level through **PostgreSQL Row Level Security (RLS)**.

---

## 2. Authentication Lifecycle Overview

```
[ Unregistered User ]
       │
       │  1. Registration (Email + Password + Full Name)
       ▼
[ Supabase Auth (auth.users) ]
       │
       ├─▶ PostgreSQL Trigger (`handle_new_user`)
       │     ├─ Idempotently provisions personal Tenant Organization (`public.organizations`)
       │     ├─ Provisions User Profile with 'owner' role (`public.profiles`)
       │     └─ Syncs membership record (`public.organization_members`)
       │
       │  2. Email Verification Dispatched
       ▼
[ Confirmation Link / Token ]
       │
       │  3. User clicks link -> /auth/callback?code=...
       ▼
[ Next.js Callback Route (`/auth/callback`) ]
       │
       │  4. exchangeCodeForSession(code)
       ▼
[ Authenticated SSR Session ]
       │
       │  5. Encrypted HTTP-Only Session Cookies (`@supabase/ssr`)
       ▼
[ Protected Workspace Console (`/`) ]
```

---

## 3. Supported Authentication Flows

### 3.1 First-Time Registration (Sign Up)
- **Endpoint**: `/login` (Tab: "Create Account")
- **Fields**: Full Name, Work Email, Password (min 6 chars), Confirm Password.
- **API Call**: `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
- **Behavior**:
  - Validates matching passwords and length policies client-side.
  - Passes user metadata to Supabase Auth.
  - Automatically invokes the `on_auth_user_created` trigger in PostgreSQL.
  - Displays explicit verification instructions to the user.

### 3.2 Standard Email + Password Sign In
- **Endpoint**: `/login` (Tab: "Sign In")
- **Fields**: Email Address, Password.
- **API Call**: `supabase.auth.signInWithPassword({ email, password })`.
- **Behavior**:
  - Directly authenticates credentials against `auth.users`.
  - Rejects unconfirmed emails if confirmation is enforced.
  - Establishes encrypted session cookies and redirects directly to `/`.

### 3.3 Passwordless Magic Link & OTP Login
- **Endpoint**: `/login` (Option: "Or sign in with passwordless Magic Link / OTP")
- **Fields**: Email Address.
- **API Call**: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: "/auth/callback" } })`.
- **Behavior**:
  - Supabase dispatches a cryptographically signed confirmation link or 6-digit numeric OTP depending on email template configuration.
  - Clicking the email confirmation link redirects to `/auth/callback?code=...`, establishing the session automatically.
  - Alternatively, if the template provides numeric digits, the user can verify directly via `supabase.auth.verifyOtp()`.

### 3.4 Forgot Password & Credential Recovery
- **Endpoint**: `/login` (Mode: "Forgot password?") & `/auth/reset-password`
- **Flow**:
  1. User enters registered work email and submits.
  2. Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: "/auth/callback?next=/auth/reset-password" })`.
  3. Supabase dispatches password recovery email with a single-use cryptographically signed token.
  4. User clicks link -> `/auth/callback` exchanges token for a recovery session and forwards to `/auth/reset-password`.
  5. User provides new password and confirms.
  6. Calls `supabase.auth.updateUser({ password })`.
  7. Session is authenticated and redirects user to `/`.

---

## 4. Session Handling & Route Protection Middleware

Session state is validated on every incoming request in `web/middleware.ts` via `@supabase/ssr`:

```typescript
const isPublicAuthRoute = 
  pathname.startsWith("/login") || 
  pathname.startsWith("/auth/callback") || 
  pathname.startsWith("/auth/reset-password");

if (user && pathname.startsWith("/login")) {
  return NextResponse.redirect("/");
}

if (!user && !isPublicAuthRoute) {
  return NextResponse.redirect("/login");
}
```

- **Token Refresh**: Expired JWT access tokens are automatically rotated using the refresh token during request execution.
- **Cookie Security**: Cookies are written with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes in production.
- **Sign Out**: Handled via `web/app/auth/signout/route.ts` which invokes `supabase.auth.signOut()` and clears all session cookies before redirecting to `/login`.

---

## 5. Multi-Tenant Provisioning & Database Trigger Architecture

Upon registration in `auth.users`, PostgreSQL trigger `on_auth_user_created` fires `public.handle_new_user()` (`SECURITY DEFINER`):

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

    INSERT INTO public.organizations (name, slug)
    VALUES (clean_name || '''s Workspace', clean_slug)
    ON CONFLICT (slug) DO UPDATE SET updated_at = NOW()
    RETURNING id INTO new_org_id;

    IF new_org_id IS NULL THEN
        SELECT id INTO new_org_id FROM public.organizations WHERE slug = clean_slug LIMIT 1;
    END IF;

    INSERT INTO public.profiles (id, organization_id, full_name, role)
    VALUES (NEW.id, new_org_id, clean_name, 'owner')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW();

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user exception: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Security Boundaries & Invariants

1. **Zero Plaintext Passwords**:
   - Plaintext passwords are never stored in application tables, logged to console, passed into AI prompts, or included in telemetry rollups.
   - All password hashing and verification is handled strictly inside Supabase Auth's isolated `auth.users` vault.
2. **Service Role Boundary**:
   - `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side backend workers and repository queries.
   - It is NEVER exposed to the frontend browser, NEVER prefixed with `NEXT_PUBLIC_`, and NEVER shared with AI models or customer server connectors.
3. **AI Layer Isolation**:
   - `@ryvix/ai` has ZERO direct database access, zero Supabase credentials, and zero connection strings.
   - All interactions flow through typed backend tool gates with deterministic RBAC and human approval thresholds.
4. **Complete Table RLS Coverage**:
   - 100% of tables (all 35 across Phase 1 and Phase 2 migrations) have Row Level Security enabled.
   - Access to resources, tasks, servers, and repositories is strictly constrained by organization membership.
