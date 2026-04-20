import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// List email intake rows (for the Inbox page).
// Never include attachment_base64 here — it's large and only needed on parse.

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const supabase = await createClient();
    let query = supabase
      .from("email_intake")
      .select(
        "id, from_address, from_name, subject, received_at, message_id, attachment_filename, attachment_mime, attachment_size_bytes, status, operator_id, parse_error, imported_booking_count, created_at, updated_at, operators(name)"
      )
      .order("received_at", { ascending: false })
      .limit(200);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
