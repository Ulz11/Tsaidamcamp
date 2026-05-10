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
| Quick-book button per ger row | ✅ | Auto-opens booking dialog |
| Slim booking dialogs (Essentials + Advanced) | ✅ | Applied to bookings-list + gers page |
| Undo-toast delete (operators) | ✅ | Optimistic + 6s undo, cascade warning in toast |
| Undo-toast delete (guests) | ✅ | Optimistic + 6s undo |
| Undo-toast delete (finance/transactions) | ✅ | Signed amount + description in toast |
| Guests management page | ✅ | Basic CRUD (page already existed) |
| Dashboard UI/UX redesign | ✅ | Colored stat cards, progress bar, enriched lists |
| Calendar view (per-ger Gantt) | ✅ | Month view, one row per ger + Unassigned section |
| Finance page improvements | ✅ | Accent-badge KPIs + MoM delta, area chart, income pie, monthly breakdown list |
| Notifications / alerts | ✅ | Header bell: arrivals/departures today + overdue payments, 2-min polling |
| Bulk operations | ⬜ | Multi-select bookings for status updates |

### Multi-language
| Feature | Status | Notes |
|---|---|---|
| EN routing + strings | ✅ | |
| MN routing + strings | ✅ | |
| Remaining i18n gaps | ⬜ | Audit all pages for missing keys |

---

## Public-Facing Site

| Feature | Status | Notes |
|---|---|---|
| Landing page | ✅ | Hero carousel, bento grid, experience, testimonials, programs, find-us, FAQ, footer — fully bilingual |
| `/api/public/gers` (read) | ✅ | Anon RLS; only `is_available=true` |
| `/api/public/gallery` (read) | ✅ | Anon RLS; ordered by `sort_order` |
| `/api/public/promotions` (read) | ✅ | Filters expired (`ends_on >= today`) |
| `/api/public/news` + `/news/[slug]` (read) | ✅ | Only `is_published=true` |
| `/api/public/availability` (read) | ✅ | `?from=&to=` returns total/available/occupied |
| `/api/public/bookings` (write) | ✅ | Locked schema, source="website", status="tentative" |
| CORS headers for public API | ✅ | Origin from `PUBLIC_WEB_ORIGIN` env, default `*` |
| Website CMS (gallery / promotions / news) | ✅ | Admin tabs at /admin/website, full CRUD + undo-toast |
| Online booking form | ⬜ | Guest self-service (next priority) |
| Availability calendar (public) | ⬜ | Shows available gers by date |
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
| Environment variables (prod) | ⬜ | Supabase prod keys |
| Auto-push to GitHub | ✅ | Claude Code Stop hook configured |

---

## Next Up (Priority Order)
1. ⬜ Online booking form + public availability calendar
2. ⬜ QPay payment integration
3. ⬜ Booking confirmation emails (Resend)
4. ⬜ Supabase Storage for ger photos (replace Unsplash placeholders on landing page)
5. ⬜ Vercel production deployment + custom domain
6. ⬜ Bulk operations (multi-select bookings for status updates)
7. ⬜ i18n audit (find missing keys across all admin pages)

---

*Last updated: 2026-04-29*
