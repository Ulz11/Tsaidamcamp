import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BookingForm } from "@/components/website/booking-form";

export default async function BookingPage() {
  const t = await getTranslations("website.bookingPage");

  return (
    <section className="px-6 pt-[120px] pb-24 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-tsaidam-clay)]">
            {t("eyebrow")}
          </p>
          <h1
            className="font-serif-display text-4xl font-medium leading-[1.15] text-[var(--color-tsaidam-ink)] text-balance sm:text-5xl"
            dangerouslySetInnerHTML={{ __html: t.raw("heading") as string }}
          />
          <p className="mx-auto mt-4 max-w-xl text-base font-light leading-relaxed text-[var(--color-tsaidam-ink-mid)]">
            {t("sub")}
          </p>
        </div>

        <Suspense fallback={null}>
          <BookingForm />
        </Suspense>
      </div>
    </section>
  );
}
