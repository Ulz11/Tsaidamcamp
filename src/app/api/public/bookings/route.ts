import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicBookingSchema } from "@/lib/validators";

// CORS preflight for the public booking POST.
// Header values are also set in next.config.ts so GET requests carry them;
// preflight responses must be 204/200 and Next doesn't auto-respond to OPTIONS.
export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * POST /api/public/bookings
 *
 * Public website booking submission. Lands in the same `bookings` table
 * the admin uses, with:
 *   source = "website"   (forced, not trusted from client)
 *   status = "tentative" (forced — admin confirms manually)
 *
 * Contact info is captured in `notes` as a small text block. We do not
 * create a `guests` row here because RLS doesn't allow anon insert on
 * `guests` and we don't want to broaden it; admin can promote the lead
 * after reviewing.
 *
 * Best-effort over-booking guard: we count ger availability in the
 * requested window and reject if zero gers are free. The admin can
 * still manually create over-quota bookings; the public form cannot.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = publicBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const checkIn = input.check_in.toISOString().slice(0, 10);
    const checkOut = input.check_out.toISOString().slice(0, 10);

    // ── Availability gate (uses service-role to read across RLS) ─────────────
    const admin = createAdminClient();

    const { count: totalGers } = await admin
      .from("gers")
      .select("id", { count: "exact", head: true })
      .eq("is_available", true);

    const { data: occupied } = await admin
      .from("booking_gers")
      .select("ger_id, bookings!inner(check_in, check_out, status)")
      .neq("bookings.status", "cancelled")
      .lt("bookings.check_in", checkOut)
      .gt("bookings.check_out", checkIn);

    const occupiedCount = new Set((occupied ?? []).map((r) => r.ger_id)).size;
    const available = Math.max((totalGers ?? 0) - occupiedCount, 0);

    if (available === 0) {
      return NextResponse.json(
        { error: "No availability for the selected dates" },
        { status: 409 }
      );
    }

    // ── Compose booking payload ────────────────────────────────────────────
    const contactBlock = [
      `Website lead — please contact:`,
      `Name: ${input.contact_name}`,
      `Phone: ${input.contact_phone}`,
      input.contact_email ? `Email: ${input.contact_email}` : null,
      input.message ? `\nMessage:\n${input.message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        source: "website",
        status: "tentative",
        check_in: checkIn,
        check_out: checkOut,
        tourist_count: input.tourist_count,
        guide_name: input.contact_name,
        guide_phone: input.contact_phone,
        notes: contactBlock,
      })
      .select("id, status, check_in, check_out")
      .single();

    if (error) {
      // RLS rejection or other DB error
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: data.id,
        status: data.status,
        check_in: data.check_in,
        check_out: data.check_out,
        message:
          "Booking received. We will contact you shortly to confirm availability and details.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/public/bookings]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
