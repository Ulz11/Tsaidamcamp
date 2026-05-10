import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";

const TESTI = [
  {
    textKey: "testi.t1.text",
    authorKey: "testi.t1.author",
    countryKey: "testi.t1.country",
  },
  {
    textKey: "testi.t2.text",
    authorKey: "testi.t2.author",
    countryKey: "testi.t2.country",
  },
  {
    textKey: "testi.t3.text",
    authorKey: "testi.t3.author",
    countryKey: "testi.t3.country",
  },
] as const;

export async function Testimonials() {
  const t = await getTranslations("website");

  return (
    <section
      id="testimonials"
      className="bg-[var(--color-tsaidam-cream)] px-6 py-20 text-center sm:px-10 lg:px-16 lg:py-32"
    >
      <Reveal>
        <p className="flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.26em] text-[var(--color-tsaidam-ink-soft)]">
          <span
            aria-hidden
            className="inline-block h-px w-7 bg-[var(--color-tsaidam-ink-soft)]"
          />
          {t("testi.eyebrow")}
        </p>
      </Reveal>
      <Reveal delay={1}>
        <h2
          className="mx-auto mt-3 max-w-md font-serif-display text-4xl font-medium leading-tight text-[var(--color-tsaidam-ink)] text-balance sm:text-5xl"
          dangerouslySetInnerHTML={{
            __html: t.raw("testi.heading") as string,
          }}
        />
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {TESTI.map((q, i) => (
          <Reveal
            key={q.authorKey}
            delay={(i + 1) as 1 | 2 | 3}
            className="rounded-sm bg-[var(--color-tsaidam-sand)] p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_oklch(0.1_0.04_155_/_0.10)]"
          >
            <div className="font-serif-display text-5xl leading-none text-[var(--color-tsaidam-clay-lt)]">
              &ldquo;
            </div>
            <div className="mt-4 mb-2 text-xs tracking-[2px] text-[var(--color-tsaidam-clay)]">
              ★★★★★
            </div>
            <p className="mb-6 text-[15px] italic leading-relaxed text-[var(--color-tsaidam-ink-mid)]">
              {t(q.textKey)}
            </p>
            <div className="font-medium text-sm text-[var(--color-tsaidam-ink)]">
              {t(q.authorKey)}
            </div>
            <div className="text-xs text-[var(--color-tsaidam-ink-soft)]">
              {t(q.countryKey)}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
