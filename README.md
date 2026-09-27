# GGChrist Admin

The private Glorious Gospel of Christ administration system, built with Next.js 16, React 19, TypeScript, Tailwind CSS, and Supabase.

## Included

- Polaris-inspired responsive administration shell for desktop and mobile
- Supabase Auth with protected dashboard routes
- Role-aware navigation for super admins, content managers, moderators, finance managers, and viewers
- Dashboard and analytics backed by live Supabase data
- Article, devotion, daily-feature, and ebook catalogue, purchase, download, shipping, and fulfillment management
- Image, audio, private ebook, and private receipt uploads
- Community moderation, user status controls, and contact-message workflow
- Stripe donation, campaign, recurring-support, and expense management
- Encrypted Stripe and Resend credentials under Settings → API
- Impact metrics, administrator roles, and audit logs

## Local setup

1. Use Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Run `npm run dev` and open `http://localhost:3001`.

Use the existing Supabase Auth administrator account. The account must also have an active row in `admin_users`; having an Auth account alone does not grant dashboard access.

## Security

Browser access uses only the Supabase publishable key and Row Level Security. The server-only service role is used narrowly for the encrypted `api_secrets` table. Configure `SUPABASE_SERVICE_ROLE_KEY` and the same `GGC_SETTINGS_ENCRYPTION_KEY` in Admin and Public deployments; never prefix either with `NEXT_PUBLIC_`.

Run `009_stripe_secure_settings_timezone_realtime.sql` before using API settings, Stripe, realtime message updates, direct MP3 uploads, or timezone scheduling. Then run `010_ebook_checkout_analytics_seo.sql` from the Public repository to enable ebook checkout fulfillment, 100 MB direct ebook uploads, campaign progress, and visitor-history indexing.

## Verification

- `npm run lint` performs the TypeScript check.
- `npm run build` creates the production Next.js build.
