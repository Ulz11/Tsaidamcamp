"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { HERO_INTERVAL_MS, HERO_SLIDES } from "@/lib/website/design";

/**
 * Hero section with cross-fading background slideshow.
 *
 * Each slide is rendered as an absolutely-positioned image; only the
 * `active` slide has `opacity-100`. Tailwind's transition handles the
 * fade. We use plain <img> tags (with `loading="eager"` for the first
 * frame) so we don't have to whitelist Unsplash in next.config — and so
 * design changes can be made without round-tripping through next/image
 * configuration.
 */
export function Hero() {
  const t = useTranslations("website.hero");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (HERO_SLIDES.length < 2) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % HERO_SLIDES.length),
      HERO_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-tsaidam-forest-deep">
      {/* Slideshow */}
      <div className="absolute inset-0">
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className={[
              "absolute inset-0 transition-opacity duration-[1500ms] ease-out",
              i === active ? "opacity-100" : "opacity-0",
            ].join(" ")}
            aria-hidden={i !== active}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt={slide.alt}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full w-full object-cover"
            />
          </div>
        ))}

        {/* Overlay — vertical gradient, deeper at top + bottom for legibility */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-tsaidam-forest-deep/70 via-tsaidam-ink/30 to-tsaidam-forest-deep/80"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-tsaidam-ink/15"
        />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col items-center justify-center px-4 pb-44 pt-32 text-center sm:px-6 lg:px-8">
        <span className="mb-6 text-[11px] font-medium uppercase tracking-[0.42em] text-tsaidam-sand/90">
          {t("subtitle")}
        </span>

        <h1 className="font-serif text-5xl font-light leading-[1.05] text-tsaidam-cream sm:text-6xl md:text-7xl lg:text-[5.25rem]">
          {t("headline")}
        </h1>

        <p className="mt-7 max-w-xl text-base font-light leading-relaxed text-tsaidam-cream/85 sm:text-lg">
          {t("tagline")}
        </p>

        <a
          href="#stay"
          className="group mt-10 inline-flex items-center gap-3 rounded-full border border-tsaidam-cream/70 px-8 py-3 text-[12px] font-medium uppercase tracking-[0.32em] text-tsaidam-cream transition-all duration-300 hover:border-tsaidam-cream hover:bg-tsaidam-cream hover:text-tsaidam-forest-deep"
        >
          {t("cta")}
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-1"
            strokeWidth={1.5}
          />
        </a>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-44 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 sm:flex">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={[
              "h-[2px] transition-all duration-500",
              i === active
                ? "w-10 bg-tsaidam-cream"
                : "w-5 bg-tsaidam-cream/40 hover:bg-tsaidam-cream/70",
            ].join(" ")}
          />
        ))}
      </div>
    </section>
  );
}
