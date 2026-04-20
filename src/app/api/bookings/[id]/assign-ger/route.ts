import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";

const bodySchema = z.object({
  ger_id: z.string().uuid(),
  guest_type: z.enum(["tourist", "staff"]).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const { id: bookingId } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify the booking exists and grab its dates so we can detect overlap.
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, check_in, check_out, status")
      .eq("id", bookingId)
      .single();
    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot assign a cancelled booking" },
        { status: 400 }
      );
    }

    // Conflict check: is this ger already linked to a booking that overlaps?
    const { data: conflicts, error: cErr } = await supabase
      .from("booking_gers")
      .select("booking_id, bookings!inner(id, check_in, check_out, status)")
      .eq("ger_id", parsed.data.ger_id)
      .neq("bookings.status", "cancelled")
      .lt("bookings.check_in", booking.check_out)
      .gt("bookings.check_out", booking.check_in);

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
    if ((conflicts ?? []).length > 0) {
      return NextResponse.json(
        { error: "Ger has a conflicting booking in this date range" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("booking_gers")
      .insert({
        booking_id: bookingId,
        ger_id: parsed.data.ger_id,
        guest_type: parsed.data.guest_type ?? "tourist",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
