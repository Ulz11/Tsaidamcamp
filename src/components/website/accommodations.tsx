import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";

type GerCard = {
  badgeKey: string;
  titleKey: string;
  descKey: string;
  price: number;
  image: string;
};

const GERS: GerCard[] = [
  {
    badgeKey: "accomm.cards.deluxe.badge",
    titleKey: "accomm.cards.deluxe.title",
    descKey: "accomm.cards.deluxe.desc",
    price: 385000,
    image:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=900&q=80",
  },
  {
    badgeKey: "accomm.cards.standard.badge",
    titleKey: "accomm.cards.standard.title",
    descKey: "accomm.cards.standard.desc",
    price: 195000,
    image:
      "https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=600&q=80",
  },
  {
    badgeKey: "accomm.cards.lakeview.badge",
    titleKey: "accomm.cards.lakeview.title",
    descKey: "accomm.cards.lakeview.desc",
    price: 290000,
    image:
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=600&q=80",
  },
  {
    badgeKey: "accomm.cards.family.badge",
    titleKey: "accomm.cards.family.title",
    descKey: "accomm.cards.family.desc",
    price: 320000,
    image:
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=700&q=80",
  },
  {
    badgeKey: "accomm.cards.glamping.badge",
    titleKey: "accomm.cards.glamping.title",
    descKey: "accomm.cards.glamping.desc",
    price: 240000,
    image:
      "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=700&q=80",
  },
  {
    badgeKey: "accomm.cards.cabin.badge",
    titleKey: "accomm.cards.cabin.title",
    descKey: "accomm.cards.cabin.desc",
    price: 155000,
    image:
      "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=700&q=80",
  },
];

// Asymmetric desktop grid placement (matches the design prototype)
const SPAN_CLASSES = [
  "lg:col-span-6 lg:row-span-1 lg:h-[360px]", // hero card
  "lg:col-span-3 lg:h-[360px]",
  "lg:col-span-3 lg:h-[360px]",
  "lg:col-span-4 lg:h-[280px]",
  "lg:col-span-4 lg:h-[280px]",
  "lg:col-span-4 lg:h-[280px]",
];

const fmtPrice = (n: number) => `₮${n.toLocaleString("mn-MN")}`;

export async function Accommodations() {
  const t = await getTranslations("website");

  return (
    <section
      id="accommodations"
      className="bg-[var(--color-tsaidam-cream)] px-6 py-20 sm:px-10 lg:px-16 lg:py-32"
    >
      <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>{t("accomm.eyebrow")}</SectionLabel>
          <h2
            className="mt-3 max-w-xl font-serif-display text-4xl font-medium leading-tight text-[var(--color-tsaidam-ink)] text-balance sm:text-5xl"
            dangerouslySetInnerHTML={{
              __html: t.raw("accomm.heading") as string,
            }}
          />
          <p className="mt-3 max-w-md text-base font-light leading-relaxed text-[var(--color-tsaidam-ink-mid)]">
            {t("accomm.sub")}
          </p>
        </div>
        <p className="text-sm text-[var(--color-tsaidam-ink-soft)]">
          {t("accomm.showing", { count: GERS.length })}{" "}
          <a
            href="#"
            className="ml-2 text-[var(--color-tsaidam-clay)] hover:underline"
          >
            {t("accomm.viewAll")} →
          </a>
        </p>
      </Reveal>

      <Reveal
        delay={2}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12"
      >
        {GERS.map((g, i) => (
          <article
            key={g.titleKey}
            className={`group relative h-[280px] cursor-pointer overflow-hidden rounded-sm bg-[var(--color-tsaidam-sand)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_16px_48px_oklch(0.1_0.04_155_/_0.18)] ${SPAN_CLASSES[i]}`}
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ backgroundImage: `url('${g.image}')` }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, oklch(0.12 0.02 60 / 0.88) 0%, oklch(0.12 0.02 60 / 0.2) 55%, transparent 100%)",
              }}
            />
            <span className="absolute left-4 top-4 z-10 rounded-[1px] bg-[var(--color-tsaidam-clay)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white">
              {t(g.badgeKey)}
            </span>
            <div className="absolute inset-x-0 bottom-0 z-10 px-5 py-5">
              <h3
                className={`font-serif-display font-medium leading-tight text-white ${
                  i === 0 ? "text-2xl" : "text-lg"
                }`}
              >
                {t(g.titleKey)}
              </h3>
              <p className="mt-1 mb-3 text-xs leading-snug text-white/70">
                {t(g.descKey)}
              </p>
              <div className="flex items-center justify-between">
                <div className="font-serif-display text-lg text-[var(--color-tsaidam-clay-lt)]">
                  {fmtPrice(g.price)}{" "}
                  <span className="font-sans text-xs font-light text-white/55">
                    / {t("accomm.night")}
                  </span>
                </div>
                <a
                  href="#"
                  className="border-b border-white/30 pb-px text-[10px] font-medium uppercase tracking-[0.1em] text-white/70 transition-colors hover:border-white hover:text-white"
                >
                  {t("accomm.viewDetails")} →
                </a>
              </div>
            </div>
          </article>
        ))}
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
