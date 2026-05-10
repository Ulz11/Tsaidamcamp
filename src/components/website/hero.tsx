"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { format, addDays } from "date-fns";

const SLIDES = [
  "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=1800&q=85",
  "https://images.unsplash.com/photo-1531761535209-180857e963b9?w=1800&q=85",
  "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=1800&q=85",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1800&q=85",
];

const SLIDE_INTERVAL = 5_000;

export function Hero() {
  const t = useTranslations("website");
  const [active, setActive] = useState(0);

  // Auto-advance
  useEffect(() => {
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      SLIDE_INTERVAL
    );
    return () => window.clearInterval(id);
  }, []);

  // Default booking dates: tomorrow + 7 days
  const today = new Date();
  const defaultCheckin = format(addDays(today, 1), "yyyy-MM-dd");
  const defaultCheckout = format(addDays(today, 8), "yyyy-MM-dd");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    document
      .getElementById("accommodations")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="relative flex min-h-[600px] w-full flex-col items-center justify-center overflow-hidden"
      style={{ height: "100vh" }}
    >
      {/* Slides */}
      {SLIDES.map((src, i) => (
        <div
          key={src}
          aria-hidden
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1400ms] ease-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url('${src}')` }}
        />
      ))}

      {/* Overlay */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.1 0.02 150 / 0.35) 0%, oklch(0.1 0.02 150 / 0.55) 50%, oklch(0.08 0.02 150 / 0.75) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[820px] px-6 text-center">
        <p
          className="tsaidam-fade-up mb-5 text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-tsaidam-clay-lt)]"
          style={{ animationDelay: "0.2s" }}
        >
          {t("hero.eyebrow")}
        </p>
        <h1
          className="tsaidam-fade-up font-serif-display text-5xl font-medium leading-[1.1] text-white text-balance sm:text-6xl md:text-7xl"
          style={{ animationDelay: "0.45s" }}
          dangerouslySetInnerHTML={{ __html: t.raw("hero.title") as string }}
        />
        <p
          className="tsaidam-fade-up mx-auto mt-5 mb-9 max-w-[520px] text-base font-light leading-relaxed text-white/80 sm:text-lg"
          style={{ animationDelay: "0.7s" }}
        >
          {t("hero.subtitle")}
        </p>
        <a
          href="#accommodations"
          className="tsaidam-fade-up inline-block bg-[var(--color-tsaidam-clay)] px-10 py-3.5 text-sm font-medium uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--color-tsaidam-clay-lt)]"
          style={{ animationDelay: "0.9s" }}
        >
          {t("hero.cta")}
        </a>
      </div>

      {/* Slide dots */}
      <div className="absolute bottom-[160px] left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 w-1.5 rounded-full border-0 p-0 transition-all duration-300 ${
              i === active
                ? "scale-150 bg-white"
                : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Booking glass bar */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-10">
        <form
          onSubmit={handleSearch}
          className="grid w-full max-w-[860px] grid-cols-1 gap-3 rounded-sm border border-white/20 bg-[oklch(0.97_0.01_80_/_0.14)] p-5 backdrop-blur-2xl backdrop-saturate-150 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto] md:gap-0 md:p-6"
        >
          <BookingField label={t("booking.checkin")} className="md:pr-6">
            <input
              type="date"
              defaultValue={defaultCheckin}
              className="w-full bg-transparent text-base text-white outline-none [color-scheme:dark]"
            />
          </BookingField>
          <BookingField
            label={t("booking.checkout")}
            className="md:border-l md:border-white/20 md:px-6"
          >
            <input
              type="date"
              defaultValue={defaultCheckout}
              className="w-full bg-transparent text-base text-white outline-none [color-scheme:dark]"
            />
          </BookingField>
          <BookingField
            label={t("booking.guests")}
            className="md:border-l md:border-white/20 md:px-6"
          >
            <select
              defaultValue="2"
              className="w-full bg-transparent text-base text-white outline-none [&_option]:bg-[var(--color-tsaidam-forest)] [&_option]:text-white"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 5
                    ? t("booking.guestPlus", { n })
                    : t("booking.guestN", { n })}
                </option>
              ))}
            </select>
          </BookingField>
          <div className="flex items-center md:pl-6">
            <button
              type="submit"
              className="w-full whitespace-nowrap rounded-sm bg-[var(--color-tsaidam-clay)] px-7 py-3 text-xs font-medium uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--color-tsaidam-clay-lt)] md:w-auto"
            >
              {t("booking.search")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function BookingField({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/65">
        {label}
      </span>
      {children}
    </div>
  );
}
