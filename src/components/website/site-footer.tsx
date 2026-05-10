import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("website");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-tsaidam-forest)] px-6 pt-16 pb-8 text-white/70 sm:px-10 lg:px-16">
      <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <div className="font-serif-display text-3xl font-semibold text-white">
            Tsaidam
          </div>
          <p className="mt-3 max-w-[220px] text-sm leading-relaxed">
            {t("footer.tagline")}
          </p>
        </div>
        <FooterCol title={t("footer.stayTitle")}>
          <FooterLink>{t("footer.stay.luxury")}</FooterLink>
          <FooterLink>{t("footer.stay.deluxe")}</FooterLink>
          <FooterLink>{t("footer.stay.standard")}</FooterLink>
          <FooterLink>{t("footer.stay.family")}</FooterLink>
        </FooterCol>
        <FooterCol title={t("footer.exploreTitle")}>
          <FooterLink>{t("footer.explore.horse")}</FooterLink>
          <FooterLink>{t("footer.explore.eagle")}</FooterLink>
          <FooterLink>{t("footer.explore.stargazing")}</FooterLink>
          <FooterLink>{t("footer.explore.culture")}</FooterLink>
        </FooterCol>
        <FooterCol title={t("footer.campTitle")}>
          <FooterLink>{t("footer.camp.about")}</FooterLink>
          <FooterLink>{t("footer.camp.gallery")}</FooterLink>
          <FooterLink>{t("footer.camp.contact")}</FooterLink>
          <FooterLink>{t("nav.booking")}</FooterLink>
        </FooterCol>
      </div>
      <div className="flex flex-col items-start justify-between gap-3 text-xs text-white/50 sm:flex-row sm:items-center">
        <span>
          © {currentYear} {t("footer.copyright")}
        </span>
        <div className="flex gap-6">
          <a href="#" className="transition-colors hover:text-white">
            {t("footer.privacy")}
          </a>
          <a href="#" className="transition-colors hover:text-white">
            {t("footer.terms")}
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
        {title}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FooterLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="#"
      className="text-sm text-white/65 transition-colors hover:text-white"
    >
      {children}
    </a>
  );
}
