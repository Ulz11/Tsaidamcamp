"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isWeekend,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type BookingRow = {
  id: string;
  operator_id: string | null;
  trip_code: string | null;
  source: "operator" | "website" | "phone" | "walkin";
  status: "confirmed" | "tentative" | "cancelled";
  check_in: string;
  check_out: string;
  tourist_count: number;
  staff_count: number;
  guide_name: string | null;
  notes: string | null;
  operators?: { name: string } | null;
};

// Tailwind color classes per booking source
const SOURCE_BAR: Record<BookingRow["source"], string> = {
  operator: "bg-blue-500/80 hover:bg-blue-500 text-white",
  website: "bg-green-500/80 hover:bg-green-500 text-white",
  phone: "bg-orange-500/80 hover:bg-orange-500 text-white",
  walkin: "bg-gray-500/80 hover:bg-gray-500 text-white",
};

const SOURCE_DOT: Record<BookingRow["source"], string> = {
  operator: "bg-blue-500",
  website: "bg-green-500",
  phone: "bg-orange-500",
  walkin: "bg-gray-500",
};

export default function CalendarPage() {
  const t = useTranslations("admin.calendar");
  const tb = useTranslations("booking");

  const [current, setCurrent] = useState<Date>(() => startOfMonth(new Date()));
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = useMemo(() => startOfMonth(current), [current]);
  const monthEnd = useMemo(() => endOfMonth(current), [current]);
  const days = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch bookings whose check_in falls on or before month-end.
      // We'll then client-filter to also require check_out >= month-start.
      const params = new URLSearchParams();
      params.set("to", format(monthEnd, "yyyy-MM-dd"));
      const res = await fetch(`/api/bookings?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as BookingRow[];
        const filtered = data.filter(
          (b) =>
            b.status !== "cancelled" &&
            parseISO(b.check_out) >= monthStart
        );
        setBookings(filtered);
      }
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const today = new Date();

  const monthStats = useMemo(() => {
    const arrivals = bookings.filter((b) => {
      const d = parseISO(b.check_in);
      return d >= monthStart && d <= monthEnd;
    }).length;
    const tourists = bookings.reduce((s, b) => s + (b.tourist_count || 0), 0);
    return { total: bookings.length, arrivals, tourists };
  }, [bookings, monthStart, monthEnd]);

  const dayCount = days.length;
  const gridTemplate = {
    gridTemplateColumns: `16rem repeat(${dayCount}, minmax(2.25rem, 1fr))`,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrent(subMonths(current, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrent(startOfMonth(new Date()))}
          >
            {t("today")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrent(addMonths(current, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <div className="ml-3 min-w-[10rem] text-lg font-semibold tabular-nums">
            {format(current, "MMMM yyyy")}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <CalendarRange className="size-5 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">
                {t("monthBookings")}
              </div>
              <div className="text-xl font-semibold">{monthStats.total}</div>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <CalendarRange className="size-5 text-green-500" />
            <div>
              <div className="text-xs text-muted-foreground">
                {t("monthArrivals")}
              </div>
              <div className="text-xl font-semibold">{monthStats.arrivals}</div>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <Users className="size-5 text-orange-500" />
            <div>
              <div className="text-xs text-muted-foreground">
                {t("monthTourists")}
              </div>
              <div className="text-xl font-semibold">{monthStats.tourists}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt grid */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarRange className="mb-2 size-10 opacity-40" />
              <p>{t("empty")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[60rem]">
                {/* Header row: day numbers */}
                <div
                  className="sticky top-0 z-10 grid border-b bg-background text-xs"
                  style={gridTemplate}
                >
                  <div className="border-r p-2 font-medium">
                    {t("booking")}
                  </div>
                  {days.map((d) => {
                    const isToday = isSameDay(d, today);
                    const weekend = isWeekend(d);
                    return (
                      <div
                        key={d.toISOString()}
                        className={[
                          "border-r py-1 text-center tabular-nums",
                          isToday
                            ? "bg-primary/10 font-bold text-primary"
                            : weekend
                            ? "bg-muted/40 text-muted-foreground"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        <div className="text-[10px] uppercase leading-none">
                          {format(d, "EEE")[0]}
                        </div>
                        <div className="text-sm leading-tight">
                          {format(d, "d")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rows: one per booking */}
                {bookings.map((b) => {
                  const ci = parseISO(b.check_in);
                  const co = parseISO(b.check_out);
                  const visibleStart = maxDate([ci, monthStart]);
                  const visibleEnd = minDate([co, monthEnd]);
                  const startCol =
                    differenceInCalendarDays(visibleStart, monthStart) + 2; // +2: grid is 1-indexed & first column is the label
                  const span = Math.max(
                    1,
                    differenceInCalendarDays(visibleEnd, visibleStart) + 1
                  );
                  const total =
                    (b.tourist_count || 0) + (b.staff_count || 0);
                  const label =
                    b.trip_code ||
                    b.operators?.name ||
                    b.guide_name ||
                    "—";
                  const title = [
                    label,
                    `${format(ci, "MMM d")} → ${format(co, "MMM d")}`,
                    `${total} ${tb("touristCount")}/${tb("staffCount")}`,
                    b.notes ?? "",
                  ]
                    .filter(Boolean)
                    .join("\n");

                  return (
                    <div
                      key={b.id}
                      className="grid items-center border-b hover:bg-muted/30"
                      style={gridTemplate}
                    >
                      {/* Label cell */}
                      <div className="truncate border-r px-2 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={[
                              "size-2 shrink-0 rounded-full",
                              SOURCE_DOT[b.source],
                            ].join(" ")}
                          />
                          <span className="truncate font-medium">{label}</span>
                        </div>
                        {b.operators?.name && b.trip_code && (
                          <div className="truncate text-[10px] text-muted-foreground">
                            {b.operators.name}
                          </div>
                        )}
                      </div>

                      {/* Day cells — empty backdrop for grid lines */}
                      {days.map((d, idx) => (
                        <div
                          key={idx}
                          className={[
                            "h-10 border-r",
                            isWeekend(d) ? "bg-muted/20" : "",
                            isSameDay(d, today) ? "bg-primary/5" : "",
                          ].join(" ")}
                        />
                      ))}

                      {/* Booking bar, absolute-positioned via grid-column */}
                      <div
                        className={[
                          "relative my-1 flex items-center overflow-hidden rounded-md px-2 text-xs font-medium transition-colors",
                          SOURCE_BAR[b.source],
                          b.status === "tentative"
                            ? "opacity-70 ring-1 ring-dashed ring-white/40"
                            : "",
                        ].join(" ")}
                        style={{
                          gridColumn: `${startCol} / span ${span}`,
                          gridRow: 1,
                          height: "1.75rem",
                          alignSelf: "center",
                        }}
                        title={title}
                      >
                        <span className="truncate">
                          {label}
                          {total > 0 && (
                            <span className="ml-1 opacity-80">· {total}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">{t("legend")}:</span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-blue-500" />
          {tb("sourceOperator")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-green-500" />
          {tb("sourceWebsite")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-orange-500" />
          {tb("sourcePhone")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-gray-500" />
          {tb("sourceWalkin")}
        </span>
        <span className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {tb("statusTentative")}
          </Badge>
          <span className="opacity-60">— {t("tentativeHint")}</span>
        </span>
      </div>
    </div>
  );
}
