"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  LogIn,
  LogOut,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type BookingRow = {
  id: string;
  trip_code: string | null;
  check_in: string;
  check_out: string;
  tourist_count: number | null;
  staff_count: number | null;
  guide_name: string | null;
  payment_status: "unpaid" | "partial" | "paid" | null;
  payment_amount: number | null;
  total_amount: number | null;
  operators?: { name: string } | null;
};

type AlertsPayload = {
  checkInsToday: BookingRow[];
  checkOutsToday: BookingRow[];
  overduePayments: BookingRow[];
  generatedAt: string;
};

const REFRESH_MS = 120_000; // 2 min

// ── Component ────────────────────────────────────────────────────────────────

export function NotificationsBell() {
  const t = useTranslations("admin.alerts");
  const [data, setData] = useState<AlertsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/alerts", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as AlertsPayload;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const total = useMemo(() => {
    if (!data) return 0;
    return (
      data.checkInsToday.length +
      data.checkOutsToday.length +
      data.overduePayments.length
    );
  }, [data]);

  // Tag: red if any overdue, amber if only today's events, none if zero
  const tone: "critical" | "info" | "none" =
    !data || total === 0
      ? "none"
      : data.overduePayments.length > 0
        ? "critical"
        : "info";

  const badgeClass =
    tone === "critical"
      ? "bg-red-500 text-white"
      : tone === "info"
        ? "bg-amber-500 text-white"
        : "bg-muted text-muted-foreground";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={t("title")}
            className="relative gap-2"
          >
            <Bell className="h-4 w-4" />
            {total > 0 ? (
              <span
                className={cn(
                  "absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  badgeClass
                )}
              >
                {total > 99 ? "99+" : total}
              </span>
            ) : null}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 max-h-[70vh] overflow-y-auto p-0"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-semibold">{t("title")}</div>
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {!data ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t("loading")}
          </div>
        ) : total === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-6 w-6 opacity-40" />
            {t("empty")}
          </div>
        ) : (
          <div className="divide-y">
            {data.checkInsToday.length > 0 && (
              <Section
                icon={<LogIn className="h-4 w-4 text-emerald-500" />}
                title={t("checkInsToday")}
                count={data.checkInsToday.length}
                items={data.checkInsToday}
                onNavigate={() => setOpen(false)}
                variant="checkIn"
              />
            )}
            {data.checkOutsToday.length > 0 && (
              <Section
                icon={<LogOut className="h-4 w-4 text-sky-500" />}
                title={t("checkOutsToday")}
                count={data.checkOutsToday.length}
                items={data.checkOutsToday}
                onNavigate={() => setOpen(false)}
                variant="checkOut"
              />
            )}
            {data.overduePayments.length > 0 && (
              <Section
                icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
                title={t("overduePayments")}
                count={data.overduePayments.length}
                items={data.overduePayments}
                onNavigate={() => setOpen(false)}
                variant="overdue"
              />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  count,
  items,
  onNavigate,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  items: BookingRow[];
  onNavigate: () => void;
  variant: "checkIn" | "checkOut" | "overdue";
}) {
  return (
    <div className="px-2 py-2">
      <div className="mb-1 flex items-center justify-between px-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon}
          {title}
        </div>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
          {count}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map((b) => (
          <Link
            key={b.id}
            href="/admin/bookings"
            onClick={onNavigate}
            className="block rounded-md px-1.5 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {b.trip_code ||
                    b.operators?.name ||
                    b.guide_name ||
                    b.id.slice(0, 8)}
                </div>
                <div className="mt-0.5 truncate text-muted-foreground">
                  {rowDetail(b, variant)}
                </div>
              </div>
              {variant === "overdue" && (
                <OwedBadge
                  total={Number(b.total_amount ?? 0)}
                  paid={Number(b.payment_amount ?? 0)}
                />
              )}
              {variant !== "overdue" && b.tourist_count != null && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                  {Number(b.tourist_count) + Number(b.staff_count ?? 0)} pax
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function rowDetail(
  b: BookingRow,
  variant: "checkIn" | "checkOut" | "overdue"
) {
  const ci = parseISO(b.check_in);
  const co = parseISO(b.check_out);
  if (variant === "checkIn") {
    return `${format(ci, "MMM d")} → ${format(co, "MMM d")}${
      b.operators?.name && b.trip_code ? ` · ${b.operators.name}` : ""
    }`;
  }
  if (variant === "checkOut") {
    return `${format(ci, "MMM d")} → ${format(co, "MMM d")}${
      b.operators?.name && b.trip_code ? ` · ${b.operators.name}` : ""
    }`;
  }
  // overdue
  const daysLate = Math.max(0, differenceInCalendarDays(new Date(), co));
  return `${format(co, "MMM d")} · ${daysLate}d overdue`;
}

function OwedBadge({ total, paid }: { total: number; paid: number }) {
  const owed = Math.max(0, total - paid);
  return (
    <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-red-700 dark:text-red-300">
      {fmt(owed)} ₮
    </span>
  );
}

function fmt(amount: number) {
  return new Intl.NumberFormat("mn-MN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}
