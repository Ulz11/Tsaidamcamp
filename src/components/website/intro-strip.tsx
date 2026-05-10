"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Stat = {
  value: number;
  display: (n: number) => string;
  labelKey: "intro.gers" | "intro.elevation" | "intro.satisfaction";
};

const STATS: Stat[] = [
  { value: 40, display: (n) => `${n}+`, labelKey: "intro.gers" },
  {
    value: 2600,
    display: (n) => `${n.toLocaleString()}m`,
    labelKey: "intro.elevation",
  },
  { value: 98, display: (n) => `${n}%`, labelKey: "intro.satisfaction" },
];

export function IntroStrip() {
  const t = useTranslations("website");
  const ref = useRef<HTMLDivElement | null>(null);
  const [counts, setCounts] = useState(STATS.map(() => 0));
  const startedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const duration = 1400;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
              setCounts(STATS.map((s) => Math.round(s.value * eased)));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.45 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 bg-[var(--color-tsaidam-forest)] sm:grid-cols-3"
    >
      {STATS.map((s, i) => (
        <div
          key={s.labelKey}
          className={`relative px-10 py-12 text-center ${
            i < STATS.length - 1
              ? "border-b border-white/10 sm:border-b-0 sm:border-r"
              : ""
          }`}
        >
          <div className="font-serif-display text-5xl font-normal leading-none text-white">
            {s.display(counts[i])}
          </div>
          <div className="mt-2 text-xs font-normal uppercase tracking-[0.14em] text-white/50">
            {t(s.labelKey)}
          </div>
          <span
            aria-hidden
            className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 bg-[var(--color-tsaidam-clay)]"
          />
        </div>
      ))}
    </div>
  );
}
