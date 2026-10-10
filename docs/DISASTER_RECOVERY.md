# Backup & Restore Guide

## Backup Strategy
Anchor Fashion relies on Supabase's managed infrastructure for relational data and object storage.

### Database Backups
- **Daily Automated Backups**: Supabase automatically takes daily logical backups of the PostgreSQL database.
- **Point-In-Time-Recovery (PITR)**: Enabled on Pro tier. Allows restoring the database to any exact second within the last 7 days (or 30 days for Enterprise).

### Storage Backups
- Supabase Storage buckets (e.g., product images) are replicated across availability zones but are NOT included in the daily database snapshots.
- **Action**: Run a weekly CRON script to sync the `product-images` bucket to a secondary cold storage (e.g., AWS S3 Glacier).

### Configuration Backups
- Environment variables are securely stored in Vercel. 
- **Action**: Use the Vercel CLI to pull a local `.env.production` backup periodically.

## Disaster Recovery Checklist (Database Corruption)
1. **Identify the Point of Failure**: Use `obs_logs` to determine the exact timestamp when corruption began.
2. **Pause Traffic**: Enable Vercel Maintenance Mode or block traffic at the edge to prevent further writes.
3. **Initiate PITR**: Go to Supabase Dashboard -> Database -> Backups -> PITR. Select a timestamp 5 minutes prior to the corruption event.
4. **Verify Restoration**: Query the database to ensure integrity.
5. **Resume Traffic**: Disable Maintenance Mode.
