import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { bookingInsertSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: bgs, error: bgsErr } = await supabase
      .from("booking_gers")
      .select("booking_id")
      .eq("ger_id", id);

    if (bgsErr) return NextResponse.json({ error: bgsErr.message }, { status: 500 });

    const ids = (bgs ?? []).map((r) => r.booking_id);
    if (ids.length === 0) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("bookings")
      .select("*, operators(name)")
      .in("id", ids)
      .neq("status", "cancelled")
      .order("check_in", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();

    const result = bookingInsertSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    // Atomic insert: booking + booking_gers in a single transaction.
    // The check_ger_availability trigger inside the RPC will raise if
    // the ger is already booked for the requested dates.
    const { data, error } = await supabase.rpc("create_booking_with_ger", {
      p_ger_id: id,
      p_booking: {
        ...result.data,
        check_in: result.data.check_in.toISOString().slice(0, 10),
        check_out: result.data.check_out.toISOString().slice(0, 10),
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
