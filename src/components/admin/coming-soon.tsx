import { useTranslations } from "next-intl";
import { Construction } from "lucide-react";

export function ComingSoon({ title }: { title: string }) {
  const tc = useTranslations("common");
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="rounded-lg border border-dashed bg-muted/30 p-12 text-center">
        <Construction className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <div className="text-lg font-medium">{tc("comingSoon")}</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {tc("comingSoonDesc")}
        </p>
      </div>
    </div>
  );
}
