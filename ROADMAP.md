# Roadmap — Tsaidam Camp

Status: ✅ Done | 🔄 In Progress | ⬜ Pending | 🚫 Blocked

---

## Core Platform

### Admin App
| Feature | Status | Notes |
|---|---|---|
| Dashboard (live KPIs, occupancy, upcoming, pending payments) | ✅ | |
| Bookings (CRUD + filter + CSV import + undo-toast delete) | ✅ | |
| Gers (CRUD + drag-drop canvas + beds/area + availability) | ✅ | |
| Ger ↔ booking assignment (drag/drop, conflict check) | ✅ | |
| Calendar (per-ger Gantt, month view + unassigned tray) | ✅ | |
| Meals (daily calculator, printable kitchen sheet) | ✅ | |
| Guests (search, linked to bookings) | ✅ | |
| Operators (CRM + booking count, undo-toast) | ✅ | |
| Finance (transactions CRUD, CSV import, charts) | ✅ | |
| Notifications bell (arrivals / departures / overdue) | ✅ | 2-min polling |
| Website CMS (gallery / promotions / news) | ✅ | |
| Inbox — Gmail PDF forwarder + intake table | ✅ | Optional; requires Gmail Apps Script + AI key |
| Upload-PDF — direct PDF → Claude → review → bulk import | ✅ | Gracefully degrades when AI key absent |
| Settings page | ⬜ | Empty placeholder route — hide or build |
| Bulk ops (multi-select bookings) | ⬜ | Nice-to-have |

### Multi-language
| Feature | Status | Notes |
|---|---|---|
| EN routing + strings | ✅ | |
| MN routing + strings | ✅ | |
| i18n audit (catch missing keys) | ⬜ | |

---

## Public-Facing Site

| Feature | Status | Notes |
|---|---|---|
| Landing page (hero, accommodations, experience, testimonials, programs, find-us, FAQ, footer) | ✅ | Fully bilingual |
| `/api/public/gers`, `/gallery`, `/promotions`, `/news`, `/availability`, `/bookings` | ✅ | RLS-locked |
| Online booking form | ✅ | `/[locale]/booking` — soft availability probe + POST to `/api/public/bookings` (forces `source=website`, `status=tentative`). Hero search bar + navbar + FloatCta all wired to it. |
| Public availability calendar | ⬜ | |
| Booking confirmation emails | ⬜ | Needs Resend or similar |
| Payment integration (QPay) | ⬜ | |

---

## Infrastructure

| Feature | Status | Notes |
|---|---|---|
| Supabase schema + RLS (migrations 001–005) | ✅ | |
| Atomic booking RPC + overlap-prevention trigger | ✅ | |
| Supabase Storage for ger photos | ⬜ | Currently uses Unsplash |
| Vercel deployment | ⬜ | Not started — local dev only |
| Auto-push to GitHub | ✅ | Claude Code Stop hook |

---

## Cost & complexity notes

- **PDF parser** defaults to `claude-haiku-4-5-20251001` (Haiku 4.5). ~5× cheaper than Sonnet. Override via `ANTHROPIC_PDF_MODEL` env var if accuracy issues come up.
- `ANTHROPIC_API_KEY` is **optional**. Without it the Upload-PDF page shows a friendly message; the rest of the app works as normal.
- Inbox + email-intake is a separable subsystem. If you never use it, the `/api/email-intake/` route and `/admin/inbox` page can be deleted with no impact on the core.

---

## Next Up (priority order)

1. ⬜ Public availability calendar (visual month view of free dates)
2. ⬜ Supabase Storage for ger photos
3. ⬜ Vercel deployment + custom domain
4. ⬜ QPay payment integration
5. ⬜ Booking confirmation emails (Resend)
6. ⬜ Bulk operations + i18n audit

---

*Last updated: 2026-05-13*
