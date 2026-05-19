# Tsaidam Camp — Handoff

A bilingual (MN/EN) management platform for **Tsaidam tourist camp** (40 gers, Khövsgöl region, May–September season). Replaces Excel + paper PDFs + phone notes with a single web app.

---

## What's built

### Admin (`/[locale]/admin`)
- **Dashboard** — live KPIs (arrivals/departures today, occupancy %, active bookings, pending payments)
- **Bookings** — list/filter/CRUD, CSV import, status + payment fields, undo-toast deletes
- **Gers** — CRUD + drag-drop camp-layout canvas, configurable beds (JSONB), area-based sizing
- **Calendar** — per-ger Gantt month view + Unassigned tray
- **Meals** — daily totals, printable kitchen sheet ("13+4" style)
- **Guests** — searchable directory, linked to bookings
- **Operators** — CRM with booking counts
- **Finance** — transactions CRUD, CSV import, area chart + pies, MoM delta KPIs
- **Notifications bell** — arrivals/departures today + overdue payments, 2-min polling
- **Inbox** — Gmail-forwarded PDFs (optional, needs AI key)
- **Upload-PDF** — drop a PDF, Claude parses, review, bulk import
- **Website CMS** — gallery / promotions / news editor

### Public site (`/[locale]`)
- Landing page: hero carousel, bento accommodations, experience, testimonials, programs, find-us (Google Maps), FAQ, footer
- Public read APIs for gers / gallery / promotions / news / availability
- Public booking endpoint (anon RLS, source="website", status="tentative")

---

## Tech stack

| Layer | Pick | Gotcha |
|---|---|---|
| Framework | **Next.js 16.2.4** (App Router, Turbopack) | Conventions differ from training data — read `node_modules/next/dist/docs/` before writing boilerplate |
| React | **19.2** | Server Components default |
| UI | **@base-ui/react** | Not Radix. `Button` does not support `asChild`. Use `buttonVariants()` on `<Link>` or `<Trigger render={<Button />}>` |
| i18n | **next-intl 4** | `messages/{en,mn}.json` — namespaces: `common`, `auth`, `admin.*`, `booking`, `ger`, `meal`, `operator`, `finance`, `website.*` |
| DB | **Supabase** (Postgres + RLS) | Anon key for admin pages (RLS); `createAdminClient()` for service-role webhooks |
| PDF parsing | **Anthropic SDK** (PDF document blocks + prompt caching) | Default model `claude-haiku-4-5-20251001`. Override via `ANTHROPIC_PDF_MODEL`. Key is **optional** — UI shows friendly fallback when absent |
| Charts | **Recharts** | Finance only |
| DnD | **@dnd-kit/core** | Camp-layout canvas + booking-tray assign |

---

## Local setup

```powershell
npm install

# .env.local — see existing file. Required:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
# Optional:
#   ANTHROPIC_API_KEY        (enables PDF parsing — leave as placeholder to disable)
#   ANTHROPIC_PDF_MODEL      (default: claude-haiku-4-5-20251001)
#   EMAIL_INTAKE_SECRET      (only if using Gmail webhook)

# If using a new Supabase project, apply migrations in order:
#   supabase/migrations/001..005

npm run dev
```

Visit `http://localhost:3000/en/admin` (or `/mn/admin`). Without Supabase env, you'll see an amber "not configured" banner instead of a crash.

---

## Guardrails

1. **Read Next 16 docs in `node_modules/next/dist/docs/` before writing routes** — App Router conventions differ from older Next versions.
2. **Base UI, not Radix.** No `asChild` on `<Button>`.
3. **Always guard Supabase env** in server components. Use `isEnvConfigured()` pattern from `src/app/[locale]/(admin)/admin/page.tsx`.
4. **i18n first.** No hardcoded English. Update `en.json` + `mn.json` together.
5. **Never commit `.env.local`.** Never log attachment base64. Inbox list endpoint strips `attachment_base64` — keep it that way.
6. **Type-check before declaring done.** `npx tsc --noEmit` should pass.

---

## Cost & complexity notes

- PDF parsing defaults to **Haiku 4.5** (~5× cheaper than Sonnet) with prompt-caching on the system prompt. Token usage is shown in the UI after each parse.
- `ANTHROPIC_API_KEY` is optional. If you don't need PDF auto-parse, leave it as the placeholder and add bookings manually from the Bookings page.
- The **Inbox + Gmail webhook** is a separable subsystem. If you never use it, you can delete `src/app/api/email-intake/`, `src/app/[locale]/(admin)/admin/inbox/`, and `supabase/gmail-forwarder/` with no impact on the rest.

---

## What's next

See `ROADMAP.md` — priorities in order:
1. Online booking form on the public site
2. Decide on the empty Settings page (build or hide)
3. Supabase Storage for ger photos
4. Vercel deployment
