# Production Deployment Guide

## Prerequisites
- **Vercel** Account (Pro recommended for increased function timeouts).
- **Supabase** Pro Account (for automated backups and PITR).
- Custom Domain registered.

## 1. Environment Variables
Ensure the following variables are set in the Vercel Production Environment:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID`

## 2. Vercel Configuration
1. Connect the GitHub repository to a new Vercel Project.
2. **Framework Preset**: Next.js (Auto-detected).
3. **Build Command**: `npm run build`
4. **Install Command**: `npm install`
5. **Output Directory**: `.next`
6. Deploy.

## 3. Domain & SSL
1. In Vercel Project Settings -> Domains, add your custom domain.
2. Configure DNS (A Record / CNAME) as instructed by Vercel.
3. SSL Certificates are automatically provisioned via Let's Encrypt.
4. Ensure `Strict-Transport-Security` headers are active (configured in `next.config.ts`).

## 4. Supabase Configuration
1. Verify Row-Level Security (RLS) is enabled on all public-facing tables.
2. Disable the `public` schema API exposure if not explicitly required.
3. Configure Auth Redirect URLs to point exclusively to the production domain.

## 5. Rollback Procedure
If a critical failure occurs post-deployment:
1. Navigate to Vercel Deployments tab.
2. Locate the last stable deployment.
3. Click the vertical ellipsis (`...`) -> **Promote to Production** or **Instant Rollback**.
4. Monitor the `/api/health` endpoint until stability is confirmed.
