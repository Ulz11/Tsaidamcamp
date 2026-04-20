export type BookingMeal = {
  id: string;
  trip_code: string | null;
  tourist_count: number;
  staff_count: number;
  check_in: string;
  check_out: string;
  operators?: { name: string } | null;
};

export type MealTotals = {
  tourists: number;
  staff: number;
  total: number;
};

export function calculateMeals(
  bookings: BookingMeal[],
  skippedIds: Set<string>
): MealTotals {
  const active = bookings.filter((b) => !skippedIds.has(b.id));
  const tourists = active.reduce((s, b) => s + (b.tourist_count || 0), 0);
  const staff = active.reduce((s, b) => s + (b.staff_count || 0), 0);
  return { tourists, staff, total: tourists + staff };
}
