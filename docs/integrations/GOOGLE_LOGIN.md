# Google login setup

Google login supplements the existing email/password and email-verification flow.
The same button on Sign In and Create Account uses Supabase OAuth with
`prompt=select_account`. No Gmail permissions or offline Google refresh access
are requested. Signing in with Google does not connect a Gmail inbox.

## Implemented application flow

1. Browser SSR client starts OAuth and stores the PKCE verifier through the SDK.
2. Google returns to Supabase Auth; Supabase redirects to `/auth/callback`.
3. The callback exchanges the code, verifies the user, and checks their profile
   and current organization membership through the authenticated RLS client.
4. Success redirects to `/dashboard`, where existing phone onboarding applies.
5. Cancellation, expired codes or missing workspace records lead to `/auth/error`.
   This page offers a local sign-out/restart; workspace failures also offer a
   read-only retry. It never grants a role or manufactures an organization.

The existing `handle_new_user()` trigger is responsible for first-account
provisioning. It catches database errors, so authentication alone is not proof
that provisioning succeeded. If retry keeps failing, inspect Auth/Postgres logs
and restore the expected profile/membership through the existing administrative
workflow. A linked existing identity must retain its existing user/workspace.

Production callbacks require `RYVIX_PUBLIC_URL` as an HTTPS origin without a path,
query, or credentials. Redirects always target that origin and `/dashboard`;
caller-supplied `next` destinations and proxy host headers are not used.
Middleware allows callback/error routes and preserves refreshed session cookies
on redirects. Authentication codes and provider error descriptions are not logged
or displayed by the new routes.

## Configure Google Cloud first

1. Open Google Auth Platform for the intended Cloud project. Configure branding
   (Ryvix, support contact and applicable homepage/privacy/terms URLs).
2. Choose the audience. For general customers use External; while in Testing,
   add the Google accounts that will perform acceptance testing.
3. Configure only basic identity scopes: `openid`, email and profile.
4. Create an OAuth client of type **Web application**.
5. Add the application's origins, such as `https://YOUR-RYVIX-DOMAIN` and
   `http://localhost:3000` for development.
6. Add the **Supabase** authorized redirect URI copied from its Google provider
   settings. For the project's currently configured hosted Supabase URL this is:
   `https://tsoyrpgifovzwqtgpkkb.supabase.co/auth/v1/callback`.
   If using a different Supabase project or custom Auth domain, copy its actual
   callback instead. This is not the Ryvix `/auth/callback` URL.
7. Save the Client ID and Client Secret directly in Supabase provider settings.
   Do not put the secret in browser variables, source control or chat.

## Configure Supabase

1. Open **Authentication → Sign In / Providers → Google** (the dashboard may
   label the provider section differently). Enable Google and enter its Web
   Client ID and Client Secret. Keep normal token/nonce verification enabled.
2. Under **Authentication → URL Configuration**, set Site URL to the production
   app origin: `https://YOUR-RYVIX-DOMAIN`.
3. Add these exact allowed redirect URLs for the environments you use:
   - `https://YOUR-RYVIX-DOMAIN/auth/callback`
   - `http://localhost:3000/auth/callback`
4. Keep the Email provider and existing password/signup settings enabled. Do not
   disable the existing email-verification or recovery configuration.
5. Ensure new-user signups are allowed if Google must also create new accounts.
6. Deploy this code with `RYVIX_PUBLIC_URL=https://YOUR-RYVIX-DOMAIN` in the web
   server environment. For a local development server, unset it or use the local
   origin; the development callback can use the incoming local origin.

No new database migration is required specifically for Google login. The existing
profile/organization/membership schema and trigger must be deployed. The pending
team and repository-URL migrations are separate work.

## Identity and password expectations

Use Supabase's verified identity linking, not a custom email-based merge. Test an
existing verified email/password user signing in with the same Google email:
the user ID and workspace must remain the same. Different Google emails are
different accounts unless linked through a separately authorized linking flow.
Unverified-account collisions must follow Supabase's security behavior.

A Google-only user has no Ryvix password automatically. Their Google password is
never a Ryvix password. They can continue using Google; using password login later
requires setting a Ryvix password through verified password recovery. Verify that
the existing recovery email template supports the app's six-digit OTP flow.

## Live acceptance after configuration

- New Google user, returning Google user, and existing verified password account
  with the same email; check user ID, profile and membership without duplicates.
- Account chooser, cancellation, logout/relogin and switching Google accounts.
- Expired/reused callback codes, missing PKCE verifier and workspace lookup failure.
- Session retained after refresh and access to protected pages/API routes.
- Existing manual signup, email OTP, password login and password recovery.
- Phone onboarding and phone/browser widths, including a physical mobile browser.

Local fixture tests cannot certify Google credentials, consent configuration,
hosted callback allowlists, identity linking or hosted trigger execution.

References: [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google),
[identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking),
[Google account selection](https://developers.google.com/identity/openid-connect/openid-connect),
[Google button branding](https://developers.google.com/identity/branding-guidelines).
