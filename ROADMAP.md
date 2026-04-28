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
| Website CMS (gallery / promotions / news) | ✅ | Tabs page at /admin/website with full CRUD + undo-toast |
| Guests management page | ⬜ | Basic CRUD |
| Finance page improvements | ⬜ | Better charts, monthly breakdown |
| Calendar view | ⬜ | Month/week view of all bookings across gers |
| Notifications / alerts | ⬜ | Check-in today, overdue payments |
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
| Supabase schema + RLS | ✅ | Migrations 001–005 applied |
| Atomic booking RPC | ✅ | Migration 003 |
| Beds + area columns | ✅ | Migration 004 |
| Gallery / promotions / news tables + RLS | ✅ | Migration 005 |
| Supabase Storage (images) | ⬜ | Ger photos |
| Vercel deployment | ⬜ | CI/CD pipeline |
| Environment variables (prod) | ⬜ | Supabase prod keys, `PUBLIC_WEB_ORIGIN` |
| Auto-push to GitHub | ✅ | Claude Code Stop hook configured |

---

## Next Up (Priority Order)
1. ⬜ Calendar view for all ger bookings
2. ⬜ Guests management page
3. ⬜ Booking confirmation emails (transactional)
4. ⬜ Supabase Storage uploads for gallery / cover images (replace URL-paste)
5. ⬜ Vercel deployment setup with `PUBLIC_WEB_ORIGIN` for Claude-Design front-end

---

*Last updated: 2026-04-25*
