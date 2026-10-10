# Anchor Fashion Enterprise Architecture

This document synthesizes the core operational platforms that support the Anchor Fashion E-commerce enterprise: Security, Performance, Monitoring, Reliability, and Backup/Recovery.

## 1. Security Architecture

Anchor Fashion implements a Zero-Trust security model.

### Application Security

- **Content Security Policy (CSP):** Enforced via Next.js `middleware.ts`, strictly controlling origins for scripts, styles, and images.
- **Security Headers:** HSTS, X-Frame-Options (DENY), X-XSS-Protection, and Referrer-Policy applied universally.
- **CSRF Protection:** Next.js Server Actions and custom API routes are protected using cryptographically secure tokens.
- **Data Privacy:** Sensitive data (PII, Credit Cards) is masked at the application layer via `lib/security/encryption.ts` before logging or display.

### API Security

- **Rate Limiting & Throttling:** Handled at the Edge (Middleware/Vercel) to prevent abuse.
- **Key Validation & Request Freshness:** Incoming webhook or external API traffic is validated against replay attacks and HMAC-SHA256 signatures.

## 2. Performance Architecture

Performance is optimized for a sub-2-second Time to Interactive (TTI) globally.

- **Next.js App Router:** Utilizes React Server Components (RSC) to ship zero client-side JavaScript for static content.
- **Edge Caching:** `next.config.ts` enforces CDN rules. Next.js Image Optimization serves WebP/AVIF format automatically based on the user's Accept header.
- **Code Splitting:** Dynamic imports are used for heavy components (e.g., charts, rich text editors).

## 3. Reliability & Resilience

- **Circuit Breakers:** `lib/reliability/circuit-breaker.ts` wraps all downstream integrations (e.g., Courier API, Payment Gateway) to prevent cascading failures.
- **Graceful Degradation:** If the Recommendation Engine fails, a fallback cache of trending products is served.

## 4. Monitoring & Observability

- **Observability Service:** Centralized in `lib/observability.ts`. It records Application Health, API Health, and Database Health.
- **Dashboards:** Main Admins have access to `/admin/security` and `/admin/monitoring` to view real-time events, latency, database connections, and active threats.
- **AI Telemetry:** Tokens, latency, and cost of LLM (Gemini) operations are tracked independently for cost optimization.

## 5. Backup & Recovery Strategy

- **Database Backup:** Continuous archiving (WAL) via Supabase, with Point-in-Time Recovery (PITR) up to 7 days, and daily snapshots stored in cold storage for 1 year.
- **Storage Backup:** Supabase Storage buckets (S3-compatible) are versioned and replicated cross-region.
- **RPO/RTO:**
  - Recovery Point Objective (RPO): 15 minutes.
  - Recovery Time Objective (RTO): 1 hour.

## 6. Folder Structure

```
anchor-fashion/
├── app/
│   ├── (admin)/admin/security/     # Security Command Center
│   ├── (admin)/admin/monitoring/   # Observability Dashboard
├── lib/
│   ├── security/
│   │   ├── encryption.ts           # Data masking, AES encryption
│   │   ├── csrf.ts                 # CSRF Token generation
│   │   └── api-security.ts         # HMAC Signatures, Replay protection
│   ├── reliability/
│   │   └── circuit-breaker.ts      # Circuit Breaker pattern
│   └── observability.ts            # Core logging & metrics engine
├── middleware.ts                   # Edge security, CSP, headers, Auth check
└── next.config.ts                  # Image optimization, caching rules
```

## 7. Enterprise Best Practices Checklist

- [x] Passwords must never be stored in plain text (Supabase Auth handles this).
- [x] Secrets must never be committed to source control (validated via pre-commit hooks).
- [x] Security headers must achieve an A+ on Mozilla Observatory.
- [x] Core Web Vitals must be strictly monitored (LCP < 2.5s, FID < 100ms, CLS < 0.1).
- [x] Failures in third-party services must not crash the primary application loop.
