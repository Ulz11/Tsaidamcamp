# Changelog — Tsaidam Camp

All notable changes to this project are documented here.
Each entry corresponds to a Claude Code session.

---

## [2026-04-21] — Session 5: Calendar + Finance + Notifications Bell

### Completed

#### Calendar — per-ger Gantt view
- **Bookings API `?include=gers`** (`src/app/api/bookings/route.ts`)
  - New query param (comma-separated `include` list) adds a `booking_gers(ger_id)` nested select
  - Existing callers unaffected — default select still `*, operators(name)`
- **Calendar page rewritten** (`src/app/[locale]/(admin)/admin/calendar/page.tsx`)
  - **One row per ger** — fetches gers in parallel, renders them sorted by `sort_order` then name
  - Each ger row shows `<HomeIcon> GerName` + `type · capacity` subtitle (beds sum preferred over `capacity` column)
  - Booking bars stack inside their ger row, positioned via CSS grid `gridColumn: startCol / span N`
  - **Unassigned section** — collapsible band showing bookings with no `booking_gers` entries, so dispatchers immediately see what still needs placement
  - Header column relabeled "Ger" (was "Booking")
  - Bars now carry a colored source dot inline with the label for scanability at low widths
- **i18n keys added** — `gerColumn`, `unassigned`, `unassignedHint`, `noGers`, `capacity` in both `en.json` + `mn.json`; `subtitle` reworded to "…across gers"

#### Finance page revamp (`src/app/[locale]/(admin)/admin/finance/page.tsx`)
- **KPI cards redesigned** — dashboard-matching colored accent badges (emerald/rose/sky) with icon on the right, big tabular number, and a **Month-over-Month delta** row underneath (arrow up/down, % change, "vs last month" hint)
  - Income: higher-is-better (green up/red down)
  - Expense: lower-is-better (green down/red up)
  - Balance: higher-is-better, badge flips rose when balance goes negative
  - Gracefully handles missing prior-month baseline (shows hint only, no broken "Infinity%" delta)
- **Monthly trend chart** upgraded from LineChart → **AreaChart with gradient fills** (emerald/rose), taller (220px), smoother visual weight
- **Monthly breakdown list** added alongside the chart — compact scrollable table (12 months, newest first) with per-month income / expense / net columns, "This month" badge on the current row, color-coded net column (green positive / red negative)
- **Second pie chart for income** — expense + income pies now sit side-by-side in a 2-col grid instead of expense-only
- **Charts section reorganized** into two tiers: (1) trend area + breakdown list, (2) expense pie + income pie
- New `KpiCard` component introduced at the bottom of the file; encapsulates icon badge, value, delta logic
- New i18n keys: `incomeBreakdown`, `monthlyBreakdown`, `vsLastMonth`, `net`, `thisMonth` (EN + MN)

#### Notifications bell in admin header
- **New endpoint `/api/alerts`** (`src/app/api/alerts/route.ts`) — single call returns three grouped lists:
  - `checkInsToday` — bookings arriving today
  - `checkOutsToday` — bookings departing today
  - `overduePayments` — non-cancelled bookings whose `check_out < today` and `payment_status != paid` (capped at 20)
  - All groups exclude cancelled bookings
- **`NotificationsBell` component** (`src/components/admin/notifications-bell.tsx`)
  - Bell button in the top-right of every admin page (next to the language toggle) with a colored count badge: red if any overdue, amber if only same-day events, hidden when zero
  - Clicking opens a Popover with three sections (arriving / departing / overdue) — each row is a `Link` to `/admin/bookings`, closes the popover on click
  - Arriving/departing rows show `check_in → check_out` + pax count; overdue rows show a red `₮ owed` pill + days-late count
  - Polls `/api/alerts` every 2 minutes with `cache: "no-store"` so counts stay fresh without a full refresh
  - Graceful loading + empty states ("You're all caught up")
- **`AdminHeader` updated** — `<NotificationsBell />` mounted before the language switcher
- New i18n namespace `admin.alerts` with `title`, `loading`, `empty`, `checkInsToday`, `checkOutsToday`, `overduePayments` (EN + MN)
- TypeScript + ESLint clean ✓

### Pending
See `ROADMAP.md` for full plan.

---

## [2026-04-21] — Session 4: Dashboard Redesign + Undo-Toast Rollout

### Completed
- **Admin dashboard redesigned** (`src/app/[locale]/(admin)/admin/page.tsx`)
  - **Stat cards** — 4 cards with colored icon badges (emerald/amber/sky/violet), large tabular numbers, descriptive subtitles
  - **Occupancy card** — adds a thin animated progress bar showing ger fill rate at a glance
  - **Arrivals/Departures** — descriptions now show guest count (tourists + staff) instead of just the date
  - **Page header** — full weekday + date displayed alongside "Dashboard" title for daily context
  - **Upcoming 7 Days list** — enriched rows: colored dot (green = today, amber = tomorrow, sky = 2+ days), payment status badge (unpaid/partial), source label, pax count, hover highlight
  - **Pending Payments panel** — breakdown list of top 6 unpaid bookings sorted by amount owed, color-coded by payment status (unpaid = red, partial = amber), fallback ID when no trip code
  - **Pending query** — now fetches `trip_code` for display in breakdown list
- **Undo-toast rollout across admin pages** — one-click optimistic delete + 6s undo across the rest of the admin surface (matches the pattern already in bookings + gers)
  - `src/app/[locale]/(admin)/admin/guests/page.tsx` — guest delete dialog removed; `handleDelete(guest)` now snapshots state, optimistically removes, toasts with undo/commit
  - `src/app/[locale]/(admin)/admin/operators/page.tsx` — operator delete dialog removed; toast description surfaces the "has N bookings" warning when `booking_count > 0` so the user still sees cascade risk before the 6s commit window
  - `src/app/[locale]/(admin)/admin/finance/page.tsx` — transaction delete dialog removed; toast description shows signed amount (+/−), currency, and description (`−50,000 ₮ · Salary payment`) for quick scan-and-undo
- TypeScript + ESLint clean ✓

### Pending
See `ROADMAP.md` for full plan.

---

## [2026-04-20] — Session 3: UX Friction Reduction + UI Prototype

### Completed
- **Undo-toast system** (`src/components/ui/toast.tsx`)
  - `ToastProvider`, `useToast()` hook, variants (success/error/info/default)
  - Undo pattern: `onCommit` fires on expiry, `onUndo` cancels
- **Locale layout wired** — `ToastProvider` wraps all pages
- **i18n strings added** — `undo`, `deleted`, `undone`, `saved`, `quickBook`, `markPaid`, `markConfirmed`, `advanced`, `essentials` in both `en.json` + `mn.json`
- **Bookings list refactored** (`src/components/admin/bookings-list.tsx`)
  - One-click delete with 6s undo toast (removed confirmation dialog)
  - Inline quick actions: Confirm (tentative→confirmed), Mark Paid
  - Slim dialog: 7 essentials shown, Advanced collapsed by default
  - `localStorage` persists last-used source/operator/status
- **Gers page refactored** (`src/app/[locale]/(admin)/admin/gers/page.tsx`)
  - Quick-book `+` icon on every ger row → opens booking dialog immediately
  - Ger delete replaced with optimistic undo-toast (no confirmation dialog)
  - Booking dialog inside sheet: Advanced fields collapsed behind toggle
  - Error/info banners replaced with transient toasts
  - `autoOpenBooking` prop threads from table row → `GerDetailSheet`
- **UI prototype built** (`tsaidam-dashboard.html`) — standalone design reference

### Pending
See `ROADMAP.md` for full plan.

---

## [2026-04-19] — Session 2: Drag-Drop Assignment + Ger Configurability

### Completed
- **Unassigned bookings tray** — draggable chips, drop onto ger canvas to assign
- **Ger beds configurability** — JSONB `beds` array, `BedsEditor` with presets + custom
- **Ger area sizing** — `area_sqm` field, canvas icons scale linearly (12m²→40px / 40m²→110px)
- **Migration 004** — `gers.beds` JSONB + `gers.area_sqm` columns (applied to Supabase)
- **Assign-ger API** — `POST /api/bookings/[id]/assign-ger` with conflict check (409)
- **Booking state enrichment** — `GET /api/gers` returns `booking_state`, `active_booking`, `next_booking`
- **5-state color system** — green/sky/orange/rose/amber per ger status

### Pending
- Finance page delete dialogs → undo toast
- Operators/Guests page delete dialogs → undo toast
- Guest-facing booking page (public-facing site)

---

## [2026-04-18] — Session 1: Project Foundation

### Completed
- Next.js 16 + React 19 + Supabase + next-intl setup
- MN/EN multi-language routing (`[locale]` segment)
- Admin layout with sidebar nav
- Gers management page (CRUD, camp layout canvas, drag-reposition)
- Bookings management (full form, CSV import, status/payment fields)
- Operators management
- Finance dashboard with Recharts
- Supabase migrations 001–003 (RLS, atomic booking RPC)

---
