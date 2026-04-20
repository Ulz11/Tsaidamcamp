import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { bookingInsertSchema } from "@/lib/validators";

// Accept an array of bookings plus an optional operator_id to apply to all
const bulkBodySchema = z.object({
  operator_id: z.string().uuid().nullable().optional(),
  intake_id: z.string().uuid().nullable().optional(),
  bookings: z.array(z.unknown()).min(1, "At least one booking is required"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = bulkBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { operator_id, intake_id, bookings: rawBookings } = parsed.data;

    // Validate every booking against the insert schema. Apply the operator_id
    // from the top level if the individual booking didn't set one.
    const validated: unknown[] = [];
    const errors: Array<{ index: number; issues: unknown }> = [];

    rawBookings.forEach((raw, index) => {
      const candidate =
        typeof raw === "object" && raw !== null
          ? {
              source: "operator" as const,
              operator_id:
                (raw as Record<string, unknown>).operator_id ??
                operator_id ??
                null,
              ...(raw as Record<string, unknown>),
            }
          : raw;
      const result = bookingInsertSchema.safeParse(candidate);
      if (result.success) {
        validated.push(result.data);
      } else {
        errors.push({ index, issues: result.error.issues });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Some bookings failed validation",
          errors,
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert(validated)
      .select("*, operators(name)");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If this bulk insert came from an email intake row, mark it imported
    if (intake_id) {
      try {
        await supabase
          .from("email_intake")
          .update({
            status: "imported",
            imported_booking_count: data?.length ?? 0,
          })
          .eq("id", intake_id);
      } catch {
        // non-fatal — bookings are already saved
      }
    }

    return NextResponse.json(
      { inserted: data?.length ?? 0, bookings: data },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Bulk insert failed: ${message}` },
      { status: 500 }
    );
  }
}
