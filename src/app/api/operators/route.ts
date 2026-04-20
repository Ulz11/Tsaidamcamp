import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { operatorInsertSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const withCounts = request.nextUrl.searchParams.get("withCounts") === "1";

    // When ?withCounts=1, join a count of bookings per operator. Otherwise
    // return the plain rows (used by Select dropdowns).
    const query = withCounts
      ? supabase.from("operators").select("*, bookings(count)")
      : supabase.from("operators").select("*");

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!withCounts) {
      return NextResponse.json(data);
    }

    // Flatten the `bookings: [{ count: N }]` shape into `booking_count: N`
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    const flattened = rows.map((row) => {
      const bookings = row.bookings as Array<{ count: number }> | undefined;
      const count = bookings?.[0]?.count ?? 0;
      const rest = { ...row };
      delete rest.bookings;
      return { ...rest, booking_count: count };
    });
    return NextResponse.json(flattened);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const result = operatorInsertSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("operators")
      .insert(result.data)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
