import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

/**
 * GET /api/alerts
 *
 * Returns operational alerts grouped by category:
 * - checkInsToday: bookings arriving today
 * - checkOutsToday: bookings departing today
 * - overduePayments: checked-out-but-not-fully-paid bookings
 *
 * All groups exclude cancelled bookings.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const today = format(new Date(), "yyyy-MM-dd");

    const selectCols =
      "id, trip_code, check_in, check_out, tourist_count, staff_count, guide_name, payment_status, payment_amount, total_amount, status, operators(name)";

    const [checkInsRes, checkOutsRes, overdueRes] = await Promise.all([
      supabase
        .from("bookings")
        .select(selectCols)
        .eq("check_in", today)
        .neq("status", "cancelled")
        .order("check_in", { ascending: true }),
      supabase
        .from("bookings")
        .select(selectCols)
        .eq("check_out", today)
        .neq("status", "cancelled")
        .order("check_out", { ascending: true }),
      supabase
        .from("bookings")
        .select(selectCols)
        .lt("check_out", today)
        .neq("status", "cancelled")
        .neq("payment_status", "paid")
        .order("check_out", { ascending: false })
        .limit(20),
    ]);

    const err =
      checkInsRes.error || checkOutsRes.error || overdueRes.error;
    if (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json({
      checkInsToday: checkInsRes.data ?? [],
      checkOutsToday: checkOutsRes.data ?? [],
      overduePayments: overdueRes.data ?? [],
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
