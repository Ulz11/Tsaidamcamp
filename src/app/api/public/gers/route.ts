import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/public/gers
 *
 * Returns gers safe for the public website. RLS already restricts
 * `gers` SELECT for `anon` to `is_available = true`, so we just
 * project a curated set of fields and drop layout/admin metadata
 * (pos_x/y, width, height, sort_order, etc).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gers")
      .select(
        "id, name, type, capacity, price_per_night, description_mn, description_en, image_url, beds, area_sqm"
      )
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/gers]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
