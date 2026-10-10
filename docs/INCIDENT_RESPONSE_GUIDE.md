# Incident Response Guide

## Incident Severities
- **SEV-1 (Critical)**: Platform is down, checkout is broken, or data breach detected.
- **SEV-2 (High)**: Major feature degraded (e.g., search is down, email delivery halted).
- **SEV-3 (Medium)**: Minor bugs affecting a small subset of users.

## 1. Server Failure (Vercel)
- **Symptom**: 500/502/504 errors on all routes.
- **Action**: Check Vercel Status Page. If Vercel is up, check recent deployment logs. Execute an Instant Rollback to the previous stable build.

## 2. Database Failure (Supabase)
- **Symptom**: `database: DOWN` on `/api/health`. 
- **Action**: Check Supabase Status. If regional outage, communicate to users. If accidental data deletion, initiate Point-In-Time-Recovery (PITR).

## 3. Payment Gateway / Webhook Failure
- **Symptom**: Orders remain in "Pending Payment" despite successful charges.
- **Action**: 
  1. Inspect the Payment Provider Dashboard (e.g., Stripe) for webhook delivery failures.
  2. Verify the Webhook Secret in Vercel environment variables.
  3. Replay failed webhooks manually from the provider dashboard.

## 4. Email Delivery Failure
- **Symptom**: Resend API returning 4xx/5xx, users not receiving verification emails.
- **Action**: 
  1. Verify Resend domain DNS records.
  2. Fallback to secondary SMTP if configured in `email.service.ts`.

## 5. Recovery & Post-Mortem
1. Restore Service.
2. Verify stability via `/api/health` and manual smoke test.
3. Document root cause and write a Post-Mortem.
4. Implement preventative measures in the next sprint.
