import { getTranslations } from "next-intl/server";
import { format, differenceInCalendarDays } from "date-fns";
import {
  CalendarDays,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

// ── Types ──────────────────────────────────────────────────────────────────────

type BookingRow = {
  id: string;
  trip_code: string | null;
  check_in: string;
  check_out: string;
  tourist_count: number;
  staff_count: number;
  status: "confirmed" | "tentative" | "cancelled";
  source: "operator" | "website" | "phone" | "walkin";
  payment_status: "unpaid" | "partial" | "paid";
  total_amount: number;
  payment_amount: number;
  operators?: { name: string } | null;
};

type PendingRow = {
  id: string;
  trip_code: string | null;
  total_amount: number | null;
  payment_amount: number | null;
  payment_status: string;
};

type Stats = {
  active: BookingRow[];
  upcoming: BookingRow[];
  departures: BookingRow[];
  pending: PendingRow[];
  totalGers: number;
  configured: boolean;
  error: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function isEnvConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (!/^https?:\/\//i.test(url.trim())) return false;
  if (url.includes("your-supabase") || key.includes("your-supabase")) return false;
  return true;
}

async function loadStats(todayStr: string, in7Str: string): Promise<Stats> {
  const empty: Stats = {
    active: [],
    upcoming: [],
    departures: [],
    pending: [],
    totalGers: 0,
    configured: false,
    error: null,
  };
  if (!isEnvConfigured()) return empty;
  try {
    const supabase = await createClient();
    const [activeRes, upcomingRes, departuresRes, gersRes, pendingRes] =
      await Promise.all([
        supabase
          .from("bookings")
          .select("*, operators(name)")
          .neq("status", "cancelled")
          .lte("check_in", todayStr)
          .gt("check_out", todayStr),
        supabase
          .from("bookings")
          .select("*, operators(name)")
          .neq("status", "cancelled")
          .gte("check_in", todayStr)
          .lte("check_in", in7Str)
          .order("check_in", { ascending: true }),
        supabase
          .from("bookings")
          .select("*, operators(name)")
          .neq("status", "cancelled")
          .eq("check_out", todayStr),
        supabase
          .from("gers")
          .select("id", { count: "exact", head: true })
          .eq("is_available", true),
        supabase
          .from("bookings")
          .select("id, trip_code, total_amount, payment_amount, payment_status")
          .neq("status", "cancelled")
          .neq("payment_status", "paid"),
      ]);
    return {
      active: (activeRes.data ?? []) as BookingRow[],
      upcoming: (upcomingRes.data ?? []) as BookingRow[],
      departures: (departuresRes.data ?? []) as BookingRow[],
      pending: (pendingRes.data ?? []) as PendingRow[],
      totalGers: gersRes.count ?? 0,
      configured: true,
      error: null,
    };
  } catch (err) {
    return {
      ...empty,
      configured: true,
      error: err instanceof Error ? err.message : "Failed to load dashboard",
    };
  }
}

// ── StatCard ───────────────────────────────────────────────────────────────────

type AccentColor = "emerald" | "amber" | "sky" | "violet";

const ICON_BG: Record<AccentColor, string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  amber:   "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  sky:     "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
  violet:  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
};

const BAR_COLOR: Record<AccentColor, string> = {
  emerald: "bg-emerald-500",
  amber:   "bg-amber-500",
  sky:     "bg-sky-500",
  violet:  "bg-violet-500",
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  accent,
  progress,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  accent: AccentColor;
  progress?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground leading-tight pr-2">
          {title}
        </CardTitle>
        <div className={cn("shrink-0 rounded-lg p-2", ICON_BG[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {progress !== undefined && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", BAR_COLOR[accent])}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const t = await getTranslations("admin.dashboard");
  const tb = await getTranslations("booking");

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  const in7Str = format(in7, "yyyy-MM-dd");

  const stats = await loadStats(todayStr, in7Str);
  const { active, upcoming, departures, pending, totalGers, configured, error } = stats;

  const todayArrivals = upcoming.filter((b) => b.check_in === todayStr);

  const occupiedGuests = active.reduce(
    (s, b) => s + (b.tourist_count || 0) + (b.staff_count || 0),
    0
  );
  const occupancyPct =
    totalGers > 0
      ? Math.min(100, Math.round((active.length / totalGers) * 100))
      : 0;
  const pendingPaymentsTotal = pending.reduce(
    (s, r) =>
      s + Math.max(0, Number(r.total_amount || 0) - Number(r.payment_amount || 0)),
    0
  );
  const pendingSorted = [...pending].sort((a, b) => {
    const aOwed = Math.max(0, Number(a.total_amount || 0) - Number(a.payment_amount || 0));
    const bOwed = Math.max(0, Number(b.total_amount || 0) - Number(b.payment_amount || 0));
    return bOwed - aOwed;
  });

  const dash = !configured ? "—" : undefined;

  const banner = !configured ? (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div>
        <div className="font-medium text-amber-900 dark:text-amber-200">
          Supabase is not configured
        </div>
        <div className="mt-0.5 text-amber-900/80 dark:text-amber-200/80">
          Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
          <code className="font-mono">.env.local</code>, then restart the dev
          server. Live stats will populate automatically.
        </div>
      </div>
    </div>
  ) : error ? (
    <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
      <div>
        <div className="font-medium text-red-900 dark:text-red-200">
          Couldn&apos;t load live stats
        </div>
        <div className="mt-0.5 font-mono text-xs text-red-900/80 dark:text-red-200/80">
          {error}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <span className="shrink-0 text-sm text-muted-foreground">
          {format(today, "EEEE, MMMM d, yyyy")}
        </span>
      </div>

      {banner}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("todayArrivals")}
          value={dash ?? String(todayArrivals.length)}
          icon={ArrowDownLeft}
          accent="emerald"
          description={
            configured
              ? todayArrivals.length === 0
                ? t("noArrivals")
                : `${todayArrivals.reduce((s, b) => s + (b.tourist_count || 0) + (b.staff_count || 0), 0)} ${tb("touristCount").toLowerCase()}`
              : undefined
          }
        />
        <StatCard
          title={t("todayDepartures")}
          value={dash ?? String(departures.length)}
          icon={ArrowUpRight}
          accent="amber"
          description={
            configured
              ? departures.length === 0
                ? t("noDepartures")
                : `${departures.reduce((s, b) => s + (b.tourist_count || 0) + (b.staff_count || 0), 0)} ${tb("touristCount").toLowerCase()}`
              : undefined
          }
        />
        <StatCard
          title={t("occupancyRate")}
          value={dash ?? `${occupancyPct}%`}
          icon={TrendingUp}
          accent="sky"
          description={
            configured
              ? `${active.length} / ${totalGers} ${t("totalGers")}`
              : undefined
          }
          progress={configured ? occupancyPct : undefined}
        />
        <StatCard
          title={t("activeBookings")}
          value={dash ?? String(active.length)}
          icon={CalendarDays}
          accent="violet"
          description={
            configured
              ? `${occupiedGuests} ${tb("touristCount").toLowerCase()}`
              : undefined
          }
        />
      </div>

      {/* ── Main content ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Upcoming 7 days */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4 text-muted-foreground" />
              {t("upcomingWeek")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!configured || upcoming.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
                —
              </div>
            ) : (
              <ul className="-mx-4 divide-y">
                {upcoming.slice(0, 8).map((b) => {
                  const total = (b.tourist_count || 0) + (b.staff_count || 0);
                  const daysUntil = differenceInCalendarDays(
                    new Date(b.check_in),
                    today
                  );
                  const dotCls =
                    daysUntil === 0
                      ? "bg-emerald-500"
                      : daysUntil === 1
                      ? "bg-amber-500"
                      : "bg-sky-400";
                  const sourceLabel =
                    b.source === "operator"
                      ? tb("sourceOperator")
                      : b.source === "website"
                      ? tb("sourceWebsite")
                      : b.source === "phone"
                      ? tb("sourcePhone")
                      : tb("sourceWalkin");
                  return (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                    >
                      {/* Day indicator */}
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          dotCls
                        )}
                      />

                      {/* Booking info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-medium">
                            {b.trip_code || b.operators?.name || "—"}
                          </span>
                          {b.status === "tentative" && (
                            <Badge
                              variant="secondary"
                              className="h-4 text-[10px]"
                            >
                              {tb("statusTentative")}
                            </Badge>
                          )}
                          {b.payment_status === "unpaid" && (
                            <Badge
                              variant="destructive"
                              className="h-4 text-[10px]"
                            >
                              {tb("paymentUnpaid")}
                            </Badge>
                          )}
                          {b.payment_status === "partial" && (
                            <Badge
                              variant="outline"
                              className="h-4 border-amber-400 text-[10px] text-amber-700 dark:text-amber-400"
                            >
                              {tb("paymentPartial")}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {b.operators?.name && b.trip_code
                            ? `${b.operators.name} · `
                            : ""}
                          {sourceLabel}
                        </div>
                      </div>

                      {/* Date + pax */}
                      <div className="shrink-0 text-right">
                        <div className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                          {format(new Date(b.check_in), "MMM d")} →{" "}
                          {format(new Date(b.check_out), "MMM d")}
                        </div>
                        <div className="mt-0.5 text-xs font-medium tabular-nums">
                          {total} pax
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pending payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4 text-muted-foreground" />
              {t("pendingPayments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="tabular-nums">
              <span className="text-3xl font-bold">
                {configured ? pendingPaymentsTotal.toLocaleString() : "—"}
              </span>
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ₮
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {configured
                ? `${pending.length} ${tb("title").toLowerCase()}`
                : " "}
            </p>

            {configured && pendingSorted.length > 0 && (
              <ul className="-mx-4 mt-4 divide-y">
                {pendingSorted.slice(0, 6).map((p) => {
                  const owed = Math.max(
                    0,
                    Number(p.total_amount || 0) -
                      Number(p.payment_amount || 0)
                  );
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 px-4 py-2 text-xs"
                    >
                      <span className="truncate text-muted-foreground">
                        {p.trip_code || `#${p.id.slice(0, 7)}`}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium tabular-nums",
                          p.payment_status === "unpaid"
                            ? "text-destructive"
                            : "text-amber-700 dark:text-amber-400"
                        )}
                      >
                        {owed.toLocaleString()} ₮
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
