"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, Search, Users } from "lucide-react";

/**
 * Glassmorphism quick-booking bar.
 *
 * Floats over the bottom of the hero. Local form state only — on submit
 * we hand off to the dedicated booking page (`/book`) with the dates
 * pre-filled in the URL. That keeps this component dumb (pure UI) and
 * the actual reservation flow lives somewhere else, so design changes
 * here can never break booking logic.
 */
export function BookingBar() {
  const t = useTranslations("website.quickBook");

  // Sensible defaults: today → tomorrow, 2 guests.
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      from: checkIn,
      to: checkOut,
      guests: String(guests),
    });
    // Soft-navigate; the dedicated booking page reads these params.
    window.location.href = `#book?${params.toString()}`;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-12 z-20 flex justify-center px-4">
      <form
        onSubmit={handleSearch}
        aria-label={t("title")}
        className="pointer-events-auto w-full max-w-5xl rounded-2xl border border-white/25 bg-white/12 p-2 shadow-[0_30px_60px_-20px_rgba(15,23,16,0.6)] backdrop-blur-xl"
      >
        <div className="grid grid-cols-1 gap-1 md:grid-cols-[1fr_1fr_1fr_auto] md:gap-2">
          <Field
            icon={<CalendarDays className="size-4" strokeWidth={1.5} />}
            label={t("checkIn")}
          >
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-sm text-tsaidam-cream outline-none placeholder:text-tsaidam-cream/60 [color-scheme:dark]"
              required
            />
          </Field>

          <Field
            icon={<CalendarDays className="size-4" strokeWidth={1.5} />}
            label={t("checkOut")}
            divider
          >
            <input
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-sm text-tsaidam-cream outline-none placeholder:text-tsaidam-cream/60 [color-scheme:dark]"
              required
            />
          </Field>

          <Field
            icon={<Users className="size-4" strokeWidth={1.5} />}
            label={t("guests")}
            divider
          >
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full appearance-none bg-transparent text-sm text-tsaidam-cream outline-none [color-scheme:dark]"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n} className="bg-tsaidam-forest-deep">
                  {t("guest", { count: n })}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="submit"
            className="m-1 inline-flex items-center justify-center gap-2 rounded-xl bg-tsaidam-sand px-6 py-3.5 text-[12px] font-medium uppercase tracking-[0.22em] text-tsaidam-forest-deep transition-colors hover:bg-tsaidam-cream"
          >
            <Search className="size-4" strokeWidth={1.75} />
            {t("search")}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: a labelled input cell inside the glass bar
// ---------------------------------------------------------------------------

function Field({
  icon,
  label,
  divider,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={[
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/5",
        divider ? "md:border-l md:border-white/15" : "",
      ].join(" ")}
    >
      <span className="text-tsaidam-cream/70">{icon}</span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-tsaidam-cream/70">
          {label}
        </span>
        {children}
      </span>
    </label>
  );
}
