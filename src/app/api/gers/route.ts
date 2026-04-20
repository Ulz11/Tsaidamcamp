import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { gerInsertSchema } from "@/lib/validators";
import { format, addDays } from "date-fns";

const SOON_WINDOW_DAYS = 3;

type BookingLite = {
  id: string;
  trip_code: string | null;
  check_in: string;
  check_out: string;
  tourist_count: number;
  staff_count: number;
  status: "confirmed" | "tentative" | "cancelled";
  guide_name: string | null;
  guide_phone: string | null;
  payment_status: "unpaid" | "partial" | "paid";
  total_amount: number;
  payment_amount: number;
  operators: { name: string } | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const today = format(new Date(), "yyyy-MM-dd");
    const soon = format(addDays(new Date(), SOON_WINDOW_DAYS), "yyyy-MM-dd");

    // Pull every booking that overlaps the today..today+SOON window.
    // Conditions for overlap with [today, soon]:
    //   check_in <= soon  AND  check_out > today
    const [gersRes, bookingsRes] = await Promise.all([
      supabase.from("gers").select("*").order("sort_order", { ascending: true }),
      supabase
        .from("bookings")
        .select(
          "id, trip_code, check_in, check_out, tourist_count, staff_count, status, guide_name, guide_phone, payment_status, total_amount, payment_amount, operators(name)"
        )
        .neq("status", "cancelled")
        .lte("check_in", soon)
        .gt("check_out", today),
    ]);

    if (gersRes.error) {
      return NextResponse.json({ error: gersRes.error.message }, { status: 500 });
    }

    const bookings = (bookingsRes.data ?? []) as unknown as BookingLite[];
    const ids = bookings.map((b) => b.id);

    // Map ger_id -> bookings touching this ger inside the window
    const gerBookings = new Map<string, BookingLite[]>();
    if (ids.length > 0) {
      const { data: bgs } = await supabase
        .from("booking_gers")
        .select("ger_id, booking_id")
        .in("booking_id", ids);

      for (const bg of bgs ?? []) {
        if (!bg.ger_id) continue;
        const b = bookings.find((x) => x.id === bg.booking_id);
        if (!b) continue;
        const arr = gerBookings.get(bg.ger_id) ?? [];
        arr.push(b);
        gerBookings.set(bg.ger_id, arr);
      }
    }

    const enriched = (gersRes.data ?? []).map((ger) => {
      const list = gerBookings.get(ger.id) ?? [];
      const active =
        list.find((b) => b.check_in <= today && b.check_out > today) ?? null;
      const checkingOutToday =
        active && active.check_out === format(addDays(new Date(), 1), "yyyy-MM-dd")
          ? active
          : null;
      const arrivingSoon =
        !active
          ? list.find((b) => b.check_in > today && b.check_in <= soon) ?? null
          : null;

      let booking_state:
        | "occupied"
        | "checking_out_today"
        | "arriving_soon"
        | "available";
      if (active && checkingOutToday) booking_state = "checking_out_today";
      else if (active) booking_state = "occupied";
      else if (arrivingSoon) booking_state = "arriving_soon";
      else booking_state = "available";

      return {
        ...ger,
        active_booking: active,
        next_booking: arrivingSoon,
        booking_state,
      };
    });

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const result = gerInsertSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }
    const { data, error } = await supabase
      .from("gers")
      .insert(result.data)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      { ...data, active_booking: null, next_booking: null, booking_state: "available" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
