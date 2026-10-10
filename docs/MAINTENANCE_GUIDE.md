# Maintenance Guide

## Upgrade Guide
Anchor Fashion relies on Next.js, Supabase JS, and various UI libraries. 

### Dependency Update Guide
1. **Frequency**: Run dependency audits (`npm audit`) monthly.
2. **Minor Updates**: Can be automated via Dependabot. Merge after CI/CD passes.
3. **Major Updates** (e.g., Next.js version bumps): 
   - Read the official upgrade guide.
   - Test locally using Turbopack (`npm run dev`).
   - Deploy to a Staging environment.
   - Run full E2E Playwright tests before merging to `main`.

## Database Migration Guide
1. Generate new migrations using Drizzle/Prisma CLI locally.
2. Test migrations on a local Postgres instance.
3. Apply to a Supabase Staging project.
4. During production deployment, run migrations in a pre-build step or via CI/CD before the Next.js build compiles (to ensure type safety).

## Security Patch Guide
- Subscribe to security advisories for Next.js, React, and Supabase.
- If a vulnerability is announced, patch within 24 hours (SEV-1) or 7 days (SEV-2).

## Scheduled Maintenance
- If taking the site down for major database changes:
  1. Announce downtime 48 hours in advance.
  2. Enable Vercel Maintenance Mode (bypasses routes, returns 503).
  3. Perform maintenance.
  4. Run `/api/health` validation.
  5. Disable Maintenance Mode.
