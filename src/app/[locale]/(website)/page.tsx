import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HomePage() {
  const t = useTranslations("website");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-bold text-xl tracking-tight">Tsaidam</span>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/" className="font-medium">{t("nav.home")}</Link>
            <Link href="/gers" className="text-muted-foreground hover:text-foreground">{t("nav.gers")}</Link>
            <Link href="/programs" className="text-muted-foreground hover:text-foreground">{t("nav.programs")}</Link>
            <Link href="/gallery" className="text-muted-foreground hover:text-foreground">{t("nav.gallery")}</Link>
            <Link
              href="/booking"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              {t("nav.booking")}
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center bg-gradient-to-b from-muted/50 to-background">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            {t("hero.subtitle")}
          </p>
          <Link
            href="/booking"
            className="rounded-md bg-primary px-8 py-3 text-primary-foreground font-medium hover:bg-primary/90"
          >
            {t("nav.booking")}
          </Link>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        &copy; 2026 Tsaidam Camp
      </footer>
    </div>
  );
}
