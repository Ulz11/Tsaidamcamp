import { getTranslations } from "next-intl/server";
import { MapPin, Clock } from "lucide-react";
import { Reveal } from "./reveal";

const MAPS_URL = "https://maps.google.com/?q=GRQR%2B3JF,+Баян,+Архангай,+65019";
const MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d170000!2d101.2!3d47.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zR1JRUiszSkY!5e1!3m2!1sen!2smn!4v1714000000000!5m2!1sen!2smn";

export async function FindUs() {
  const t = await getTranslations("website");

  return (
    <section
      id="findus"
      className="bg-[var(--color-tsaidam-forest)] px-6 pt-20 sm:px-10 lg:px-16"
    >
      <div className="grid grid-cols-1 items-center gap-12 pb-16 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.26em] text-white/50">
            <span
              aria-hidden
              className="inline-block h-px w-7 bg-white/50"
            />
            {t("findus.eyebrow")}
          </p>
          <h2
            className="mt-3 font-serif-display text-4xl font-medium leading-tight text-white text-balance sm:text-5xl"
            dangerouslySetInnerHTML={{
              __html: t.raw("findus.heading") as string,
            }}
          />
          <p className="mt-3 max-w-md text-base font-light leading-relaxed text-white/65">
            {t("findus.sub")}
          </p>

          <div className="mt-10 flex flex-col gap-5">
            <Detail
              icon={<MapPin className="h-4 w-4" />}
              title={t("findus.addressTitle")}
              lines={[
                t("findus.addressLine1"),
                t("findus.addressLine2"),
              ]}
            />
            <Detail
              icon={<Clock className="h-4 w-4" />}
              title={t("findus.gettingTitle")}
              lines={[
                t("findus.gettingLine1"),
                t("findus.gettingLine2"),
              ]}
            />
          </div>

          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-2 rounded-sm bg-[var(--color-tsaidam-clay)] px-7 py-3 text-xs font-medium uppercase tracking-[0.1em] text-white transition-colors hover:bg-[var(--color-tsaidam-clay-lt)]"
          >
            {t("findus.openMaps")} ↗
          </a>
        </Reveal>

        <Reveal delay={1} className="relative h-[400px] overflow-hidden rounded-sm">
          <iframe
            src={MAPS_EMBED}
            width="100%"
            height="100%"
            style={{ border: 0, filter: "grayscale(0.3) contrast(1.05)" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Tsaidam Camp location"
          />
        </Reveal>
      </div>
    </section>
  );
}

function Detail({
  icon,
  title,
  lines,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-tsaidam-clay-lt)] text-[var(--color-tsaidam-clay-lt)]">
        {icon}
      </div>
      <div>
        <div className="font-serif-display text-base text-white">{title}</div>
        <div className="mt-0.5 text-sm leading-relaxed text-white/60">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
