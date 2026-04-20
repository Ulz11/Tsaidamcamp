# Tsaidam Camp — Handoff Document

Paste this into the Claude session on the other laptop to get oriented instantly. Everything you need to continue building is below.

---

## 1. Project Proposal

**What it is.** A full management platform for **Tsaidam tourist camp** (40 gers, Khövsgöl region, May–September season). Replaces the current Excel + paper PDFs + phone-notes workflow with a single bilingual (MN/EN) web app.

**Why it exists.** The manual workflow causes overbooking, lost bookings, wrong meal counts, and suboptimal ger allocation. Tour operators each email PDFs in different formats — the system parses any of them with Claude.

**Scope in one diagram.**

```
Admin Dashboard (protected)          Public Website (marketing + online booking)
├─ Dashboard (live KPIs)             ├─ Landing
├─ Bookings (CRUD + calendar)        ├─ Gers (pulled from DB)
├─ Calendar (Gantt, month view)      ├─ Programs
├─ Gers (CRUD + drag-drop layout)    ├─ Gallery
├─ Meals (daily kitchen sheet)       └─ Booking form
├─ Operators (CRM + booking count)
├─ Guests (directory)                ← Realtime: ger availability toggle
├─ Finance (txn CRUD + CSV import)     mirrors to public site
├─ Inbox (Gmail-forwarded PDFs)
├─ Upload PDF (direct Claude parse)
└─ Website CMS
```

**Success criteria.** By **2026-04-30** (Day 14, hard deadline):

- Admin can paste any operator PDF → bookings appear in calendar with correct gers, dates, meals.
- Kitchen gets a printable daily sheet with "13+4" style totals.
- Public site takes online bookings that land as tentative in admin.
- Finance page imports bank CSV and renders monthly summary.
- Everything bilingual MN/EN, deployed on Vercel + Supabase.

**Non-goals (explicitly out of scope).** Mobile native apps, payment gateway integration, multi-camp support, staff payroll beyond expense tracking, guest-facing loyalty features.

---

## 2. Tech Stack (non-obvious choices)

| Layer | Pick | Gotcha |
|---|---|---|
| Framework | **Next.js 16.2.4** (Turbopack, App Router) | This is NOT the Next.js in your training data. Read `node_modules/next/dist/docs/` before you write boilerplate. |
| React | **19.2** | Server Components default. |
| UI primitives | **@base-ui/react** | Not Radix, not shadcn. `Button` does NOT support `asChild`. Use `buttonVariants()` + `<Link className={...}>`, or `<DropdownMenuTrigger render={<Button />}>`. |
| i18n | **next-intl 4** | Messages live in `messages/{en,mn}.json`. Client components use `useTranslations`, server components use `getTranslations` from `next-intl/server`. Namespaces: `common`, `auth`, `admin.*`, `booking`, `ger`, `meal`, `operator`, `finance`, `website.*`. |
| DB | **Supabase** (Postgres + RLS) | Admin pages use anon key with RLS; webhook/service-role endpoints use `createAdminClient()`. |
| PDF parsing | **Anthropic SDK** with native PDF input (base64 document block) | Model via `ANTHROPIC_PDF_MODEL` env, default `claude-sonnet-4-5`. System prompt uses `cache_control: { type: "ephemeral" }`. |
| DnD | **@dnd-kit/core** | Used on the camp-layout canvas. |
| Charts | **Recharts** | For finance. |

---

## 3. Current State (as of Day 8, 2026-04-18)

### Built & working

- Admin shell, sidebar, header, locale toggle, i18n setup
- Login + auth guard
- Bookings: list, filter, create/edit/cancel
- Gers: CRUD + drag-drop layout canvas + availability toggle
- Calendar: month-view Gantt with source-colored bars, stats strip, legend
- Operators: full CRM (search, add/edit/delete with FK-aware warnings, booking count)
- Upload PDF: drag-drop → Claude parse → review table → bulk import
- Inbox: Gmail-forwarder → webhook → intake table → parse → import
- Gmail Apps Script forwarder in `supabase/gmail-forwarder/`
- Dashboard: live KPIs from Supabase with graceful "not configured" fallback

### Resilience added recently

- Dashboard and Gers pages detect unconfigured Supabase env (placeholder strings like `your-supabase-url`) and render a friendly amber banner instead of crashing.
- `next.config.ts` pins `turbopack.root` to `process.cwd()` to silence stray-lockfile warnings from `C:\Users\Obama\pnpm-lock.yaml`.

### Known broken / blocked

- **`.env.local` still has placeholder values** — until real Supabase + Anthropic keys are set, every DB-backed page shows empty state. This is the #1 thing to fix on the new laptop.

### Pending (ordered by impact)

1. **Meals calculator** — daily view, sum tourists+staff across bookings, "13+4" display, printable kitchen sheet.
2. **Guests directory** — searchable by name/passport/nationality, linked to bookings.
3. **Finance** — transaction CRUD, CSV upload (Papa Parse), monthly summary with Recharts.
4. **Public website** — landing, gers, programs, gallery, online booking form.
5. **CMS** — admin editor for website text/images.
6. **Settings page** — camp details, users, API keys surface.
7. **Testing + polish + Vercel deploy**.

---

## 4. Environment Setup (new laptop — do this first)

```powershell
# 1. Clone or copy the repo to the new laptop
git clone <your-repo-url> tsaidam-camp
cd tsaidam-camp

# 2. Install dependencies
npm install

# 3. Create .env.local (copy from the old laptop verbatim, OR fill in)
#    NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
#    SUPABASE_SERVICE_ROLE_KEY=eyJ...
#    ANTHROPIC_API_KEY=sk-ant-...
#    EMAIL_INTAKE_SECRET=<random-long-string>
#    ANTHROPIC_PDF_MODEL=claude-sonnet-4-5   (optional)

# 4. If Supabase project is new: apply migrations in order
#    from supabase/migrations/: 001_schema.sql, 002_email_intake.sql, …

# 5. Run
npm run dev
```

Verify by visiting `http://localhost:3000/en/admin` — the amber setup banner should be gone and live stats should load.

---

## 5. Task Agenda for the Next Claude Session

Give these to the next Claude session in order. Each has a clear finish line so it can verify before moving on.

### Day 9 (resume here) — Meals Calculator

**Scope.** Page at `/admin/meals` with a date picker. For the selected date, list all non-cancelled bookings whose `check_in ≤ date < check_out`. Sum `tourist_count` + `staff_count` into breakfast/lunch/dinner totals. Provide per-booking override rows (skip meal). Add a "Print kitchen sheet" button that opens a clean print view with large "13+4" style totals.

**Files to create/touch.**

- `src/app/[locale]/(admin)/admin/meals/page.tsx` (new)
- `src/app/api/meals/route.ts` (GET by date, PATCH overrides)
- `src/lib/meal-calculator.ts` (helper: booking list → totals)
- `messages/{en,mn}.json` add `meal.*` keys already scaffolded — extend with `kitchenSheet`, `overrides`, `printSheet`, `noMealsToday`.

**Done when.** Picking a date in the past/future refreshes totals; print preview shows clean layout at body font-size ~32px.

### Day 10 — Guests Directory

Searchable table with linked-booking drawer. New route `/admin/guests`, API under `/api/guests`, existing `guests` table in DB.

### Day 11 — Finance

Transaction CRUD + **CSV upload via Papa Parse**. Preview parsed rows, let admin map columns (date / amount / description), confirm → bulk insert into `transactions`. Add Recharts line for month-over-month and pie for expense categories.

### Day 12 — Public Website

`src/app/[locale]/(website)/` route group. Pages: landing, `gers/`, `programs/`, `gallery/`, `booking/`. Booking form submits to `/api/bookings` with `source: "website"` and `status: "tentative"`.

### Day 13 — CMS + Realtime

`site_content` table editor. Wire Supabase realtime so ger availability toggled in admin updates the public site live.

### Day 14 — QA + Deploy

Walk through every flow. Deploy to Vercel + Supabase Cloud. Create real admin account for the team.

---

## 6. Guardrails (paste these to the next Claude)

Hard rules this project has learned the hard way:

1. **Read `node_modules/next/dist/docs/` before writing Next boilerplate.** Next 16 conventions differ from training data. `AGENTS.md` in the repo root enforces this.
2. **Base UI, not Radix.** No `asChild` on `<Button>`. Use `buttonVariants({ variant, size })` on `<Link>`, or the `render={<Button />}` slot pattern on Base UI triggers.
3. **Server components vs client components.** Pages that use state/events need `"use client"`. Async data-fetching pages stay server components and use `getTranslations` from `next-intl/server` plus `await createClient()` from `@/lib/supabase/server`.
4. **Always guard Supabase env.** Any server component that calls `createClient()` must check `isEnvConfigured()` first (see `src/app/[locale]/(admin)/admin/page.tsx` for the pattern) or wrap in try/catch. Placeholder strings (`your-supabase-*`) count as unconfigured.
5. **i18n first.** No hardcoded English. Every user-visible string goes through `t()`. Both `messages/en.json` and `messages/mn.json` must be updated in the same commit.
6. **Never commit `.env.local`.** Never log attachment base64. Inbox list endpoint strips `attachment_base64` — keep it that way.
7. **Type-check before declaring done.** Run `npx tsc --noEmit`. Zero errors is the bar.

---

## 7. Quickstart Prompt for the Other Laptop

Copy-paste this into the new Claude session:

> I'm continuing the Tsaidam Camp project on a new laptop. Read the AGENTS.md in the repo root, confirm `.env.local` has real Supabase + Anthropic keys (not placeholders), run `npm run dev`, and visit `/en/admin` to verify the dashboard shows live stats (no amber "not configured" banner). Then pick up the next task: **Day 9 — Meals Calculator**. The scope and finish line for that task are in `HANDOFF.md` at the repo root.
