import { useTranslations } from "next-intl";

import { SiteNav } from "@/components/website/site-nav";

/**
 * Public website layout.
 *
 * Owns the navbar (overlaid on the hero) and the site-wide footer, and
 * sets the marketing-site background color. The (admin) and login
 * routes use a different layout, so the earth-tone palette stays
 * isolated to the public pages.
 */
export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-tsaidam-cream text-tsaidam-ink">
      <SiteNav />
      <main className="min-h-screen">{children}</main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  const t = useTranslations("website.footer");
  const tNav = useTranslations("website.nav");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-tsaidam-forest-deep px-4 py-16 text-tsaidam-cream sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl font-medium tracking-[0.18em] uppercase">
            Tsaidam
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-tsaidam-cream/70">
            {t("tagline")}
          </p>
        </div>

        <nav className="flex flex-col gap-2 text-sm md:items-center">
          <a
            href="#stay"
            className="text-tsaidam-cream/75 hover:text-tsaidam-cream"
          >
            {tNav("gers")}
          </a>
          <a
            href="#story"
            className="text-tsaidam-cream/75 hover:text-tsaidam-cream"
          >
            {tNav("story")}
          </a>
          <a
            href="#gallery"
            className="text-tsaidam-cream/75 hover:text-tsaidam-cream"
          >
            {tNav("gallery")}
          </a>
        </nav>

        <div className="text-sm md:text-right">
          <p className="text-tsaidam-cream/75">tsaidam@example.com</p>
          <p className="text-tsaidam-cream/75">+976 7000 0000</p>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-7xl border-t border-tsaidam-cream/10 pt-6 text-xs text-tsaidam-cream/50">
        © {year} Tsaidam Camp · {t("rights")}
      </div>
    </footer>
  );
}
