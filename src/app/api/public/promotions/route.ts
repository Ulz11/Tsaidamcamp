import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/public/promotions
 *
 * Active promotions only (RLS). Also filters out promotions whose
 * date window has expired so the public site never shows stale deals.
 */
export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("promotions")
      .select(
        "id, title_mn, title_en, description_mn, description_en, discount_label, starts_on, ends_on, image_url"
      )
      .or(`ends_on.is.null,ends_on.gte.${today}`)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/promotions]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
