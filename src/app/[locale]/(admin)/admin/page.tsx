import { getTranslations } from "next-intl/server";
import { format } from "date-fns";
import {
  CalendarDays,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

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

function isEnvConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (!/^https?:\/\//i.test(url.trim())) return false;
  // Reject placeholder values so dashboard renders gracefully before setup
  if (url.includes("your-supabase") || key.includes("your-supabase")) {
    return false;
  }
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
          .select("id, total_amount, payment_amount, payment_status")
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

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("admin.dashboard");
  const tb = await getTranslations("booking");

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);
  const in7Str = format(in7, "yyyy-MM-dd");

  const stats = await loadStats(todayStr, in7Str);
  const { active, upcoming, departures, pending, totalGers, configured, error } =
    stats;

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
      s +
      Math.max(
        0,
        Number(r.total_amount || 0) - Number(r.payment_amount || 0)
      ),
    0
  );

  const banner = !configured ? (
    <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
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
    <div className="flex items-start gap-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm">
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

  const dash = !configured ? "—" : undefined;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>

      {banner}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("todayArrivals")}
          value={dash ?? String(upcoming.filter((b) => b.check_in === todayStr).length)}
          icon={ArrowDownLeft}
          description={
            configured && upcoming.filter((b) => b.check_in === todayStr).length === 0
              ? t("noArrivals")
              : configured
              ? format(today, "PPP")
              : undefined
          }
        />
        <StatCard
          title={t("todayDepartures")}
          value={dash ?? String(departures.length)}
          icon={ArrowUpRight}
          description={
            configured && departures.length === 0
              ? t("noDepartures")
              : configured
              ? format(today, "PPP")
              : undefined
          }
        />
        <StatCard
          title={t("occupancyRate")}
          value={dash ?? `${occupancyPct}%`}
          icon={TrendingUp}
          description={
            configured
              ? `${active.length} / ${totalGers} ${t("totalGers")}`
              : undefined
          }
        />
        <StatCard
          title={t("activeBookings")}
          value={dash ?? String(active.length)}
          icon={CalendarDays}
          description={
            configured
              ? `${occupiedGuests} ${tb("touristCount")} + staff`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4" />
              {t("upcomingWeek")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!configured || upcoming.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
                —
              </div>
            ) : (
              <ul className="divide-y">
                {upcoming.slice(0, 8).map((b) => {
                  const total = (b.tourist_count || 0) + (b.staff_count || 0);
                  return (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {b.trip_code || b.operators?.name || "—"}
                          </span>
                          {b.status === "tentative" && (
                            <Badge variant="secondary" className="text-[10px]">
                              {tb("statusTentative")}
                            </Badge>
                          )}
                        </div>
                        {b.operators?.name && b.trip_code && (
                          <div className="text-xs text-muted-foreground truncate">
                            {b.operators.name}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(b.check_in), "MMM d")} →{" "}
                        {format(new Date(b.check_out), "MMM d")}
                      </div>
                      <div className="text-xs font-medium tabular-nums w-10 text-right">
                        {total}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="size-4" />
              {t("pendingPayments")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {configured ? pendingPaymentsTotal.toLocaleString() : "—"}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ₮
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {configured ? `${pending.length} ${tb("title").toLowerCase()}` : " "}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
