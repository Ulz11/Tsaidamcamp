import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { format, addDays } from "date-fns";

const WINDOW_DAYS = 30;

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const today = format(new Date(), "yyyy-MM-dd");
    const horizon = format(addDays(new Date(), WINDOW_DAYS), "yyyy-MM-dd");

    // Bookings still relevant: not cancelled, not yet checked out, arriving within window.
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        "id, trip_code, source, status, check_in, check_out, tourist_count, staff_count, payment_status, total_amount, payment_amount, operators(name)"
      )
      .neq("status", "cancelled")
      .gt("check_out", today)
      .lte("check_in", horizon)
      .order("check_in", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (bookings ?? []).map((b) => b.id);
    if (ids.length === 0) return NextResponse.json([]);

    // Find which of these already have at least one ger assigned.
    const { data: bgs, error: bgErr } = await supabase
      .from("booking_gers")
      .select("booking_id")
      .in("booking_id", ids);
    if (bgErr) return NextResponse.json({ error: bgErr.message }, { status: 500 });

    const assigned = new Set((bgs ?? []).map((b) => b.booking_id));
    const unassigned = (bookings ?? []).filter((b) => !assigned.has(b.id));

    return NextResponse.json(unassigned);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
