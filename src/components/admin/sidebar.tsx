"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Home,
  UtensilsCrossed,
  Users,
  Building2,
  Wallet,
  Globe,
  FileUp,
  Inbox,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

const navItems = [
  { key: "dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { key: "calendar", href: "/admin/calendar", icon: CalendarDays },
  { key: "gers", href: "/admin/gers", icon: Home },
  { key: "meals", href: "/admin/meals", icon: UtensilsCrossed },
  { key: "operators", href: "/admin/operators", icon: Building2 },
  { key: "guests", href: "/admin/guests", icon: Users },
  { key: "inbox", href: "/admin/inbox", icon: Inbox },
  { key: "uploadPdf", href: "/admin/upload-pdf", icon: FileUp },
  { key: "finance", href: "/admin/finance", icon: Wallet },
  { key: "website", href: "/admin/website", icon: Globe },
];

export function AdminSidebar() {
  const t = useTranslations("admin.sidebar");
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
          C
        </div>
        <span className="font-semibold text-lg tracking-tight">Tsaidam</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map((item) => {
          const fullHref = `/${locale}${item.href}`;
          const isActive = item.exact
            ? pathname === fullHref
            : pathname.startsWith(fullHref);

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {locale === "mn" ? "Гарах" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
