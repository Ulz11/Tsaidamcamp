import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/public/gallery?category=<optional>
 *
 * Returns published gallery images. RLS restricts to `is_published = true`.
 */
export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category");
    const supabase = await createClient();

    let query = supabase
      .from("gallery_images")
      .select("id, url, caption_mn, caption_en, category, sort_order")
      .order("sort_order", { ascending: true });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/gallery]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
