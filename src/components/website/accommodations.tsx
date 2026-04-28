import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";

import { BENTO_TILE_CLASSES, type MockGer } from "@/lib/website/design";

/**
 * What an accommodation looks like to this section. Both the live
 * `/api/public/gers` payload and the {@link MockGer} mock fixture
 * already match this shape, so the page is free to pass either source
 * in — the section can't tell the difference.
 */
export type AccommodationItem = MockGer;

/**
 * Bento grid of accommodations.
 *
 * Server component — no client state. The asymmetric layout comes from
 * {@link BENTO_TILE_CLASSES}; rearrange tiles there without touching any
 * markup. We use plain <img> (lazy-loaded) so swapping image sources
 * doesn't require touching next.config images.remotePatterns.
 */
export function Accommodations({ items }: { items: AccommodationItem[] }) {
  const t = useTranslations("website.stay");
  // Fallback: if the live data is empty (e.g. fresh DB), the page is in
  // charge of supplying the mock list. Render an empty hint here only
  // if even that is missing.
  if (items.length === 0) {
    return (
      <section
        id="stay"
        className="bg-tsaidam-cream px-4 py-32 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.42em] text-tsaidam-clay">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 font-serif text-4xl font-light text-tsaidam-ink sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-12 text-tsaidam-ink/60">{t("empty")}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="stay"
      className="bg-tsaidam-cream px-4 py-32 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.42em] text-tsaidam-clay">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 font-serif text-4xl font-light leading-tight text-tsaidam-ink sm:text-5xl md:text-6xl">
            {t("title")}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-tsaidam-ink/65">
            {t("subtitle")}
          </p>
        </div>

        {/* Asymmetric Bento grid. Each tile picks its span from
            BENTO_TILE_CLASSES by index; extra items fall back to a
            standard 1×1 cell so adding rooms never breaks the layout. */}
        <div className="grid auto-rows-[minmax(220px,1fr)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {items.map((item, i) => (
            <AccommodationCard
              key={item.id}
              item={item}
              tileClass={
                BENTO_TILE_CLASSES[i] ?? "lg:col-span-1 lg:row-span-1"
              }
              priority={i === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function AccommodationCard({
  item,
  tileClass,
  priority,
}: {
  item: AccommodationItem;
  tileClass: string;
  priority?: boolean;
}) {
  const t = useTranslations("website.stay");

  return (
    <a
      href={`#stay-${item.id}`}
      className={[
        "group relative isolate flex flex-col justify-end overflow-hidden rounded-[20px] bg-tsaidam-forest-deep transition-transform duration-500 hover:-translate-y-0.5",
        tileClass,
      ].join(" ")}
    >
      {/* Image */}
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image_url}
          alt={item.name}
          loading={priority ? "eager" : "lazy"}
          className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-tsaidam-forest to-tsaidam-clay" />
      )}

      {/* Bottom-up overlay for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-tsaidam-ink/85 via-tsaidam-ink/30 to-transparent"
      />

      {/* Content */}
      <div className="flex flex-col gap-3 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-2xl font-light leading-tight text-tsaidam-cream sm:text-[1.65rem]">
            {item.name}
          </h3>
          <span className="shrink-0 rounded-full border border-tsaidam-cream/40 bg-tsaidam-ink/30 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-tsaidam-cream/90 backdrop-blur-sm">
            {t("capacity", { count: item.capacity })}
          </span>
        </div>

        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            {item.price_per_night != null ? (
              <p className="text-tsaidam-cream/80">
                <span className="text-[10px] uppercase tracking-[0.22em] text-tsaidam-sand/90">
                  {t("from")}
                </span>
                <span className="ml-2 font-serif text-xl font-medium text-tsaidam-cream">
                  ₮{item.price_per_night.toLocaleString()}
                </span>
                <span className="ml-1 text-[11px] uppercase tracking-[0.18em] text-tsaidam-cream/65">
                  / {t("perNight")}
                </span>
              </p>
            ) : (
              <span className="text-[11px] uppercase tracking-[0.22em] text-tsaidam-cream/70">
                {item.type}
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-tsaidam-cream transition-colors group-hover:text-tsaidam-sand">
            {t("viewDetails")}
            <ArrowUpRight
              className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          </span>
        </div>
      </div>
    </a>
  );
}
