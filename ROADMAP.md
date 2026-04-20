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
| Undo-toast delete (operators) | ⬜ | Same pattern as bookings |
| Undo-toast delete (guests) | ⬜ | Same pattern as bookings |
| Undo-toast delete (finance/transactions) | ⬜ | Same pattern as bookings |
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

| Feature | Status | Notes |
|---|---|---|
| Landing page | ⬜ | Camp overview, photos, pricing |
| Online booking form | ⬜ | Guest self-service |
| Availability calendar (public) | ⬜ | Shows available gers by date |
| Booking confirmation emails | ⬜ | Requires email service integration |
| Payment integration | ⬜ | QPay or similar Mongolian gateway |

---

## Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Supabase schema + RLS | ✅ | Migrations 001–004 applied |
| Atomic booking RPC | ✅ | Migration 003 |
| Beds + area columns | ✅ | Migration 004 |
| Supabase Storage (images) | ⬜ | Ger photos |
| Vercel deployment | ⬜ | CI/CD pipeline |
| Environment variables (prod) | ⬜ | Supabase prod keys |
| Auto-push to GitHub | ✅ | Claude Code Stop hook configured |

---

## Next Up (Priority Order)
1. ⬜ Replace delete dialogs in operators/guests/finance with undo-toast
2. ⬜ Calendar view for all ger bookings
3. ⬜ Guests management page
4. ⬜ Public landing page
5. ⬜ Vercel deployment setup

---

*Last updated: 2026-04-20*
