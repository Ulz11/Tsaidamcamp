"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function AdminHeader() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("admin.dashboard");

  const toggleLocale = () => {
    const next = locale === "mn" ? "en" : "mn";
    router.replace(pathname, { locale: next });
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{t("title")}</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLocale}
          className="gap-2"
        >
          <Languages className="h-4 w-4" />
          {locale === "mn" ? "EN" : "MN"}
        </Button>
      </div>
    </header>
  );
}
