import { useTranslations } from "next-intl";
import { ComingSoon } from "@/components/admin/coming-soon";

export default function WebsitePage() {
  const t = useTranslations("admin.sidebar");
  return <ComingSoon title={t("website")} />;
}
