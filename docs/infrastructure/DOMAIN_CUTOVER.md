# ryvix.co.in cutover

Selected canonical origin: https://ryvix.co.in. Configuration templates now use
this origin. Hosting dashboard settings and DNS have not been changed by the
agent. Historical deployment evidence referencing ryvix.vercel.app remains valid
for its observation date. Do not treat template changes as a completed cutover.

1. Add ryvix.co.in and www.ryvix.co.in to the Vercel ryvix project. Configure
   www to redirect to the apex. Copy the exact DNS records Vercel requests into
   GoDaddy DNS; replace only conflicting web records, preserve MX/TXT mail records.
   Wait for valid configuration and working HTTPS before switching application URLs.
2. Set Production APP_BASE_URL, RYVIX_PUBLIC_URL and NEXT_PUBLIC_SITE_URL to
   https://ryvix.co.in in Vercel. NEXT_PUBLIC_SITE_URL is public Config, not Secret.
3. Update Supabase Auth Site URL and allow https://ryvix.co.in/auth/callback.
   Keep existing allowed callbacks during transition. Google's Supabase provider
   callback remains the Supabase callback, not the Ryvix application callback.
4. Update GitHub OAuth homepage and callback to the new origin and
   https://ryvix.co.in/api/auth/github/callback respectively. Review configured
   GitHub webhook URLs and Gmail OAuth redirect URLs against their actual routes.
5. Set RYVIX_PUBLIC_URL on Railway workers and the local workspace environment to
   the new origin. Update Meta webhook to
   https://ryvix.co.in/api/webhooks/whatsapp when configuring Meta.
6. Redeploy Vercel and affected Railway workers; restart the local worker only
   when its other prerequisites are ready. Test login, OAuth, links and webhooks.
7. Workspace previews still need their own configured wildcard HTTPS origin.
   Changing the website domain does not configure the preview tunnel or signing.

Supabase database URLs, provider API URLs, credentials and SSH addresses do not
change with the website domain. Keep the working Vercel hostname available until
the new origin is verified. Private local development localhost origins need not
be globally replaced.
