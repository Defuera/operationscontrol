# Production Readiness Checklist

## Current State

| Area | Status | Notes |
|------|--------|-------|
| Database | ❌ SQLite | Need Supabase migration |
| Auth | ❌ None | Single-user, no protection |
| Hosting | ❌ Local | Need Vercel/similar |
| Telegram | ❌ ngrok | Need stable webhook URL |
| Error Handling | ⚠️ Basic | Console logs only |
| Testing | ❌ None | No tests |
| CI/CD | ❌ None | Manual deploys |
| Monitoring | ❌ None | No observability |
| Security | ⚠️ Basic | API keys in env |

---

## 1. Database (Critical)

**Current**: SQLite (local file)
**Target**: Supabase (PostgreSQL)

- [ ] Migrate to Supabase (see `docs/supabase_migration.md`)
- [ ] Enable real-time subscriptions
- [ ] Set up connection pooling
- [ ] Configure Row Level Security (RLS) if multi-user

---

## 2. Authentication

**Decision needed**: Single-user or multi-user?

### Option A: Single-user (Simpler)
- [ ] Add simple password protection (env-based)
- [ ] Or use Vercel Password Protection (Pro feature)
- [ ] Or Cloudflare Access

### Option B: Multi-user (Full auth)
- [ ] Supabase Auth (recommended - already using Supabase)
- [ ] Add `user_id` to all tables
- [ ] Set up Row Level Security (RLS)
- [ ] Update all queries to filter by user

**Recommendation**: Start with single-user + simple auth, add multi-user later if needed.

---

## 3. Hosting & Deployment

**Recommended**: Vercel (free tier works)

- [ ] Create Vercel project
- [ ] Connect GitHub repo
- [ ] Configure environment variables:
  ```
  DATABASE_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  OPENAI_API_KEY
  TELEGRAM_BOT_TOKEN
  ```
- [ ] Set up preview deployments for PRs
- [ ] Configure production domain

---

## 4. Telegram Bot

**Current**: ngrok (changes on restart)
**Target**: Stable webhook URL

- [ ] After Vercel deploy, update webhook:
  ```bash
  curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
    -d "url=https://yourapp.vercel.app/api/telegram/webhook"
  ```
- [ ] Add webhook secret for verification (optional but recommended)
- [ ] Handle Telegram's IP allowlist if needed

---

## 5. Security

### API Protection
- [ ] Rate limiting on AI endpoints (prevent abuse/cost overrun)
- [ ] Validate all inputs (Zod schemas)
- [ ] Sanitize user content before storing

### Environment Variables
- [ ] Never commit `.env` files
- [ ] Use Vercel environment variables
- [ ] Rotate keys periodically

### Telegram Webhook Security
- [ ] Verify webhook requests are from Telegram
- [ ] Add secret token to webhook URL

```typescript
// Verify Telegram webhook
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const token = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
if (token !== secret) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## 6. Error Handling & Monitoring

### Error Tracking
- [ ] Add Sentry for error tracking
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```

### Logging
- [ ] Structured logging (consider Axiom, Logflare, or Vercel Logs)
- [ ] Log AI tool calls and results
- [ ] Log Telegram interactions

### Health Checks
- [ ] Add `/api/health` endpoint
- [ ] Monitor with UptimeRobot or similar

---

## 7. Testing

### Unit Tests
- [ ] Set up Vitest
- [ ] Test AI tool executor functions
- [ ] Test action confirmation logic

### Integration Tests
- [ ] Test API routes
- [ ] Test Telegram webhook handling

### E2E Tests (optional)
- [ ] Playwright for critical flows

**Minimum viable**:
```bash
npm install -D vitest @testing-library/react
```

---

## 8. CI/CD

### GitHub Actions
- [ ] Lint on PR
- [ ] Type check on PR
- [ ] Run tests on PR
- [ ] Auto-deploy to Vercel on merge to main

Example `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

---

## 9. Performance

### Caching
- [ ] Cache AI tool results where appropriate
- [ ] Use React Query/SWR for client-side caching
- [ ] Consider Redis for server-side caching (if needed)

### Optimization
- [ ] Lazy load heavy components
- [ ] Optimize images (next/image)
- [ ] Review bundle size

---

## 10. Cost Management

### OpenAI
- [ ] Set usage limits in OpenAI dashboard
- [ ] Monitor token usage
- [ ] Consider caching common queries
- [ ] Use `gpt-4o-mini` for most operations (already doing this)

### Supabase
- [ ] Monitor database size (500MB free)
- [ ] Monitor bandwidth (2GB free)
- [ ] Set up usage alerts

---

## 11. Backup & Recovery

- [ ] Enable Supabase point-in-time recovery (Pro plan)
- [ ] Or schedule regular pg_dump exports
- [ ] Document recovery procedures

---

## 12. Mobile Experience

- [ ] Test on mobile devices
- [ ] Consider PWA setup for installability
- [ ] Ensure touch-friendly UI (drag-and-drop alternatives)

---

## Implementation Priority

### Phase 1: MVP Production (Do First)
1. ✅ Supabase migration (real-time + proper DB)
2. ✅ Vercel deployment
3. ✅ Environment variables
4. ✅ Update Telegram webhook
5. ✅ Basic error handling

### Phase 2: Hardening
6. Simple auth (password protection)
7. Rate limiting
8. Sentry error tracking
9. Input validation

### Phase 3: Quality
10. Unit tests for critical paths
11. CI/CD pipeline
12. Monitoring dashboard

### Phase 4: Polish
13. Performance optimization
14. Mobile improvements
15. Backup automation

---

## Quick Wins Before Deploy

```bash
# 1. Add basic rate limiting
npm install @upstash/ratelimit @upstash/redis

# 2. Add input validation
npm install zod

# 3. Add error tracking
npm install @sentry/nextjs
```

---

## Deployment Checklist

Before going live:

- [ ] All env vars set in Vercel
- [ ] Database migrated and seeded
- [ ] Telegram webhook updated to production URL
- [ ] OpenAI usage limits configured
- [ ] Error tracking active
- [ ] Tested critical flows manually
- [ ] Domain configured (optional)
