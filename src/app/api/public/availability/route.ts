import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/public/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns a coarse availability summary the public booking form can
 * use to gate submission. We do NOT expose ger IDs or guest data —
 * just total bookable gers and how many are free across the window.
 *
 * Logic: a ger is "occupied" in the window if any non-cancelled
 * booking has [check_in, check_out) that overlaps [from, to).
 *
 *   bookings.check_in < to AND bookings.check_out > from
 */
export async function GET(request: NextRequest) {
  try {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Both `from` and `to` query params are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (new Date(to) <= new Date(from)) {
      return NextResponse.json(
        { error: "`to` must be after `from`" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Total bookable gers (RLS hides unavailable ones from anon).
    const { count: total, error: gersError } = await supabase
      .from("gers")
      .select("id", { count: "exact", head: true });
    if (gersError) {
      return NextResponse.json({ error: gersError.message }, { status: 500 });
    }

    // Find ger IDs occupied in the window via booking_gers join.
    // RLS: anon doesn't have read on bookings/booking_gers, so this query
    // requires us to expose a read-only RPC or open a narrow policy. To
    // keep RLS strict, we use a service-role admin client here — it never
    // returns guest/booking data to the client, only an aggregate count.
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: occupied, error: occError } = await admin
      .from("booking_gers")
      .select("ger_id, bookings!inner(check_in, check_out, status)")
      .neq("bookings.status", "cancelled")
      .lt("bookings.check_in", to)
      .gt("bookings.check_out", from);

    if (occError) {
      return NextResponse.json({ error: occError.message }, { status: 500 });
    }

    const occupiedIds = new Set((occupied ?? []).map((row) => row.ger_id));
    const totalCount = total ?? 0;
    const occupiedCount = occupiedIds.size;
    const availableCount = Math.max(totalCount - occupiedCount, 0);

    return NextResponse.json({
      from,
      to,
      total: totalCount,
      available: availableCount,
      occupied: occupiedCount,
    });
  } catch (err) {
    console.error("[api/public/availability]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
