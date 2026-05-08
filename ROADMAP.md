# Roadmap — Tsaidam Camp

This file is updated at the end of every session.
Status: ✅ Done | 🔄 In Progress | ⬜ Pending | 🚫 Blocked

---

## Core Platform

### Admin App
| Feature | Status | Notes |
|---|---|---|
| Gers management (CRUD + canvas) | ✅ | Drag-reposition, size-by-sqm |
| Bookings management | ✅ | Full form, CSV import, status/payment |
| Ger-to-booking assignment (drag-drop) | ✅ | Unassigned tray, conflict detection |
| Bed configuration per ger | ✅ | JSONB beds, custom sizes |
| Undo-toast delete (bookings) | ✅ | 6s window, optimistic |
| Undo-toast delete (gers) | ✅ | 6s window, optimistic |
| Undo-toast delete (operators) | ✅ | 6s window, optimistic |
| Undo-toast delete (guests) | ✅ | 6s window, optimistic |
| Undo-toast delete (finance/transactions) | ✅ | 6s window, optimistic |
| Quick-book button per ger row | ✅ | Auto-opens booking dialog |
| Slim booking dialogs (Essentials + Advanced) | ✅ | Applied to bookings-list + gers page |
| Guests management page | ✅ | Basic CRUD |
| Dashboard UI/UX redesign | ✅ | Colored stat cards, progress bar, enriched lists |
| Calendar view (per-ger Gantt) | ✅ | Month view, one row per ger + Unassigned section |
| Finance page improvements | ✅ | Accent-badge KPIs + MoM delta, area chart, income pie, monthly breakdown list |
| Notifications / alerts | ✅ | Header bell: arrivals/departures today + overdue payments, 2-min polling |
| Website CMS (gallery / promotions / news) | ✅ | Tabs page at /admin/website with full CRUD + undo-toast |
| Bulk operations | ⬜ | Multi-select bookings for status updates |

### Multi-language
| Feature | Status | Notes |
|---|---|---|
| EN routing + strings | ✅ | |
| MN routing + strings | ✅ | |
| Remaining i18n gaps | ⬜ | Audit all pages for missing keys |

---

## Public-Facing Site

The front-end is built separately with Claude-Design and consumes
this app's `/api/public/*` endpoints (CORS-enabled). Only the
back-end and the admin CMS live in this repo.

| Feature | Status | Notes |
|---|---|---|
| `/api/public/gers` (read) | ✅ | Anon RLS; only `is_available=true` |
| `/api/public/programs` (read) | ✅ | Anon RLS; only `is_active=true` |
| `/api/public/gallery` (read) | ✅ | Anon RLS; ordered by `sort_order` |
| `/api/public/promotions` (read) | ✅ | Filters expired (`ends_on >= today`) |
| `/api/public/news` + `/news/[slug]` (read) | ✅ | Only `is_published=true` |
| `/api/public/availability` (read) | ✅ | `?from=&to=` returns total/available/occupied |
| `/api/public/bookings` (write) | ✅ | Locked schema, source="website", status="tentative" |
| CORS headers for public API | ✅ | Origin from `PUBLIC_WEB_ORIGIN` env, default `*` |
| Booking confirmation emails | ⬜ | Requires email service integration |
| Payment integration | ⬜ | QPay or similar Mongolian gateway |

---

## Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Supabase schema + RLS | ✅ | Migrations 001–005 applied (005 applied 2026-04-29) |
| Atomic booking RPC | ✅ | Migration 003 |
| Beds + area columns | ✅ | Migration 004 |
| Gallery / promotions / news tables + RLS | ✅ | Migration 005 |
| Supabase Storage (images) | ⬜ | Ger photos |
| Vercel deployment | ⬜ | CI/CD pipeline |
| Environment variables (prod) | ⬜ | Supabase prod keys, `PUBLIC_WEB_ORIGIN` |
| Auto-push to GitHub | ✅ | Claude Code Stop hook configured |

---

## Next Up (Priority Order)
1. ⬜ Bulk operations (multi-select bookings for status updates)
2. ⬜ Booking confirmation emails (transactional)
3. ⬜ Supabase Storage uploads for gallery / cover images (replace URL-paste)
4. ⬜ Vercel deployment setup with `PUBLIC_WEB_ORIGIN`
5. ⬜ i18n audit (find missing keys across all admin pages)

---

*Last updated: 2026-04-29*
