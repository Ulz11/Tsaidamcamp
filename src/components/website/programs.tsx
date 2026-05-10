import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";

const PROGRAMS = [
  {
    titleKey: "programs.p1.title",
    descKey: "programs.p1.desc",
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=500&q=80",
  },
  {
    titleKey: "programs.p2.title",
    descKey: "programs.p2.desc",
    image:
      "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=500&q=80",
  },
  {
    titleKey: "programs.p3.title",
    descKey: "programs.p3.desc",
    image:
      "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=500&q=80",
  },
  {
    titleKey: "programs.p4.title",
    descKey: "programs.p4.desc",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&q=80",
  },
] as const;

export async function Programs() {
  const t = await getTranslations("website");

  return (
    <section
      id="programs"
      className="bg-[var(--color-tsaidam-sand)] px-6 py-20 sm:px-10 lg:px-16 lg:py-28"
    >
      <Reveal className="mb-12 text-center">
        <p className="flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.26em] text-[var(--color-tsaidam-ink-soft)]">
          <span
            aria-hidden
            className="inline-block h-px w-7 bg-[var(--color-tsaidam-ink-soft)]"
          />
          {t("programs.eyebrow")}
        </p>
        <h2
          className="mx-auto mt-3 max-w-md font-serif-display text-4xl font-medium leading-tight text-[var(--color-tsaidam-ink)] sm:text-5xl"
          dangerouslySetInnerHTML={{
            __html: t.raw("programs.heading") as string,
          }}
        />
      </Reveal>

      <Reveal
        delay={1}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {PROGRAMS.map((p) => (
          <article
            key={p.titleKey}
            className="overflow-hidden rounded-sm bg-[var(--color-tsaidam-cream)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_oklch(0.1_0.02_65_/_0.10)]"
          >
            <div
              aria-hidden
              className="h-44 w-full bg-cover bg-center"
              style={{ backgroundImage: `url('${p.image}')` }}
            />
            <div className="p-5">
              <h3 className="font-serif-display text-base font-medium text-[var(--color-tsaidam-ink)]">
                {t(p.titleKey)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-tsaidam-ink-soft)]">
                {t(p.descKey)}
              </p>
            </div>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
