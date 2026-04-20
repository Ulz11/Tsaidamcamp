"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Printer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateMeals, type BookingMeal } from "@/lib/meal-calculator";

const MEALS = ["breakfast", "lunch", "dinner"] as const;

export default function MealsPage() {
  const t = useTranslations("meal");
  const tc = useTranslations("common");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [bookings, setBookings] = useState<BookingMeal[]>([]);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    setSkippedIds(new Set());
    try {
      const res = await fetch(`/api/meals?date=${date}`);
      if (!res.ok) throw new Error(await res.text());
      setBookings(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fetchFailed"));
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate, fetchBookings]);

  const totals = calculateMeals(bookings, skippedIds);

  const toggleSkip = (id: string, include: boolean) => {
    setSkippedIds((prev) => {
      const next = new Set(prev);
      if (!include) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const activeBookings = bookings.filter((b) => !skippedIds.has(b.id));

  const displayDate = (() => {
    try {
      return format(new Date(selectedDate + "T00:00:00"), "MMMM d, yyyy");
    } catch {
      return selectedDate;
    }
  })();

  return (
    <>
      {/* ── Screen UI (hidden on print) ── */}
      <div className="space-y-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              {t("printKitchenSheet")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {MEALS.map((meal) => (
            <Card key={meal}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(meal)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tabular-nums">
                  {loading ? "—" : `${totals.tourists}+${totals.staff}`}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {!loading &&
                    `= ${totals.total} ${t("totalPeople").toLowerCase()}`}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bookings table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("booking")}</TableHead>
                  <TableHead className="text-right w-24">{t("touristCount")}</TableHead>
                  <TableHead className="text-right w-24">{t("staffCount")}</TableHead>
                  <TableHead className="text-right w-24">{t("included")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      {tc("loading")}
                    </TableCell>
                  </TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      {t("noMealsToday")}
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => {
                    const skipped = skippedIds.has(b.id);
                    return (
                      <TableRow key={b.id} className={skipped ? "opacity-40" : ""}>
                        <TableCell>
                          <div className="font-medium">
                            {b.trip_code || b.operators?.name || "—"}
                          </div>
                          {b.trip_code && b.operators?.name && (
                            <div className="text-xs text-muted-foreground">
                              {b.operators.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.tourist_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.staff_count}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            size="sm"
                            checked={!skipped}
                            onCheckedChange={(checked) => toggleSkip(b.id, checked)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ── Kitchen Sheet (print only) ── */}
      <div className="hidden print:block p-8 font-sans">
        <div className="mb-10 text-center">
          <div className="text-4xl font-bold">Tsaidam Tourist Camp</div>
          <div className="mt-2 text-2xl">{t("kitchenSheet")}</div>
          <div className="mt-1 text-xl text-gray-600">{displayDate}</div>
        </div>

        {/* Big meal totals */}
        <div className="grid grid-cols-3 gap-6 text-center">
          {MEALS.map((meal) => (
            <div key={meal} className="rounded-lg border-2 border-gray-300 p-6">
              <div className="mb-4 text-2xl font-bold uppercase tracking-wide">
                {t(meal)}
              </div>
              <div className="text-7xl font-extrabold tabular-nums leading-none">
                {totals.tourists}+{totals.staff}
              </div>
              <div className="mt-3 text-3xl font-semibold text-gray-600">
                = {totals.total}
              </div>
            </div>
          ))}
        </div>

        {/* Per-booking breakdown */}
        {activeBookings.length > 0 && (
          <table className="mt-10 w-full border-collapse text-lg">
            <thead>
              <tr className="border-b-2 border-gray-400">
                <th className="py-2 text-left">{t("booking")}</th>
                <th className="py-2 text-right">{t("touristCount")}</th>
                <th className="py-2 text-right">{t("staffCount")}</th>
              </tr>
            </thead>
            <tbody>
              {activeBookings.map((b) => (
                <tr key={b.id} className="border-b border-gray-200">
                  <td className="py-2">
                    {b.trip_code || b.operators?.name || "—"}
                    {b.trip_code && b.operators?.name && (
                      <span className="ml-2 text-base text-gray-500">
                        ({b.operators.name})
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{b.tourist_count}</td>
                  <td className="py-2 text-right tabular-nums">{b.staff_count}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-400 font-bold">
                <td className="py-2">{tc("total")}</td>
                <td className="py-2 text-right tabular-nums">{totals.tourists}</td>
                <td className="py-2 text-right tabular-nums">{totals.staff}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
