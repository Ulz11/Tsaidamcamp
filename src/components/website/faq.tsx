"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Reveal } from "./reveal";

const QUESTIONS = [
  { qKey: "faq.q1.q", aKey: "faq.q1.a" },
  { qKey: "faq.q2.q", aKey: "faq.q2.a" },
  { qKey: "faq.q3.q", aKey: "faq.q3.a" },
  { qKey: "faq.q4.q", aKey: "faq.q4.a" },
  { qKey: "faq.q5.q", aKey: "faq.q5.a" },
] as const;

export function Faq() {
  const t = useTranslations("website");
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="bg-[var(--color-tsaidam-sand)] px-6 py-20 sm:px-10 lg:px-16 lg:py-32"
    >
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.26em] text-[var(--color-tsaidam-ink-soft)]">
            <span
              aria-hidden
              className="inline-block h-px w-7 bg-[var(--color-tsaidam-ink-soft)]"
            />
            {t("faq.eyebrow")}
          </p>
          <h2
            className="mt-3 font-serif-display text-4xl font-medium leading-tight text-[var(--color-tsaidam-ink)] sm:text-5xl"
            dangerouslySetInnerHTML={{
              __html: t.raw("faq.heading") as string,
            }}
          />
          <p className="mt-4 max-w-md text-base font-light leading-relaxed text-[var(--color-tsaidam-ink-mid)]">
            {t("faq.sub")}
          </p>
          <a
            href="#findus"
            className="mt-7 inline-block border-b border-[var(--color-tsaidam-clay)] pb-0.5 text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-tsaidam-clay)]"
          >
            {t("faq.contact")} →
          </a>
        </Reveal>

        <Reveal delay={1} className="flex flex-col">
          {QUESTIONS.map((q, i) => {
            const isOpen = open === i;
            return (
              <div
                key={q.qKey}
                className={`border-t border-[var(--color-tsaidam-sand-dk)] ${
                  i === QUESTIONS.length - 1
                    ? "border-b"
                    : ""
                } overflow-hidden`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left font-serif-display text-base font-medium text-[var(--color-tsaidam-ink)] transition-colors hover:text-[var(--color-tsaidam-forest)] sm:text-lg"
                >
                  <span>{t(q.qKey)}</span>
                  <span
                    aria-hidden
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-tsaidam-sand-dk)] text-[var(--color-tsaidam-clay)] transition-all duration-300 ${
                      isOpen
                        ? "rotate-45 border-[var(--color-tsaidam-clay)]"
                        : ""
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-5 text-sm leading-loose text-[var(--color-tsaidam-ink-mid)]">
                      {t(q.aKey)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
