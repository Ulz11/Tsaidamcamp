# Changelog — Tsaidam Camp

All notable changes to this project are documented here.
Each entry corresponds to a Claude Code session.

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
