import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Reveal } from "./reveal";

const FEATURES = [
  { icon: "✦", titleKey: "experience.f1.title", descKey: "experience.f1.desc" },
  { icon: "◎", titleKey: "experience.f2.title", descKey: "experience.f2.desc" },
  { icon: "⟡", titleKey: "experience.f3.title", descKey: "experience.f3.desc" },
] as const;

export async function Experience() {
  const t = await getTranslations("website");

  return (
    <section
      id="experience"
      className="grid grid-cols-1 items-center gap-12 bg-[var(--color-tsaidam-sand)] px-6 py-20 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-16 lg:py-32"
    >
      <Reveal className="relative aspect-[4/5] max-w-[480px] overflow-hidden rounded-sm">
        <Image
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80"
          alt="Mongolian landscape"
          fill
          sizes="(max-width: 1024px) 100vw, 480px"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute -bottom-5 -right-5 aspect-square w-[55%] rounded-sm border-4 border-[var(--color-tsaidam-sand)] bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=500&q=80')",
          }}
        />
      </Reveal>

      <Reveal delay={2}>
        <SectionLabel>{t("experience.eyebrow")}</SectionLabel>
        <h2
          className="mt-3 font-serif-display text-4xl font-medium leading-tight text-[var(--color-tsaidam-ink)] text-balance sm:text-5xl"
          dangerouslySetInnerHTML={{
            __html: t.raw("experience.heading") as string,
          }}
        />
        <p className="mt-3 max-w-md text-base font-light leading-relaxed text-[var(--color-tsaidam-ink-mid)]">
          {t("experience.sub")}
        </p>

        <div className="mt-10 flex flex-col gap-6">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.titleKey}
              delay={(i + 1) as 1 | 2 | 3}
              className="flex items-start gap-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-tsaidam-clay-lt)] text-sm text-[var(--color-tsaidam-clay)]">
                {f.icon}
              </div>
              <div>
                <div className="font-serif-display text-base font-medium text-[var(--color-tsaidam-ink)]">
                  {t(f.titleKey)}
                </div>
                <div className="mt-0.5 text-sm leading-relaxed text-[var(--color-tsaidam-ink-mid)]">
                  {t(f.descKey)}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.26em] text-[var(--color-tsaidam-ink-soft)]">
      <span
        aria-hidden
        className="inline-block h-px w-7 bg-[var(--color-tsaidam-ink-soft)]"
      />
      {children}
    </p>
  );
}
