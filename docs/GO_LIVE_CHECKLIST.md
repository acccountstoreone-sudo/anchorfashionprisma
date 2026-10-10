# Go-Live Checklist

## Pre-Launch Checklist
- [ ] **DNS Settings**: Custom domain points to Vercel (CNAME/A records propagated).
- [ ] **SSL/TLS**: HTTPS is enforced, certificates are valid.
- [ ] **Environment Variables**: All production secrets are populated in Vercel.
- [ ] **Database Connection**: Supabase production URL and Service Role keys verified.
- [ ] **Email Setup**: Resend domain verified, DKIM/SPF configured.
- [ ] **Payment Gateways**: Live API keys inserted, Sandbox mode disabled. Webhook endpoints updated to production URL.
- [ ] **Third-Party APIs**: Courier APIs (FedEx, DHL) switched to production credentials.
- [ ] **Performance**: Image optimization enabled, caching headers verified.

## Launch Checklist
- [ ] Disable "Under Construction" or password protection on Vercel.
- [ ] Submit `sitemap.xml` to Google Search Console.
- [ ] Perform one real end-to-end purchase using a live credit card (immediately refund it).
- [ ] Monitor real-time Analytics (GA4) to confirm tracking.

## Post-Launch Checklist
- [ ] Confirm automated database backups (Supabase PITR) are active.
- [ ] Verify error tracking (Sentry) is receiving source maps.
- [ ] Conduct a load test (if anticipated high traffic) using an external tool to verify Edge/Serverless limits.

## Production Monitoring
- [ ] Setup external uptime monitoring for `/api/health`.
- [ ] Configure PagerDuty/Slack alerts for SEV-1 incidents.
- [ ] Assign On-Call rotation.
