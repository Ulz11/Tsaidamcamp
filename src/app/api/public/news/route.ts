import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/public/news?limit=20
 *
 * Returns published news posts ordered by published_at DESC.
 * Body fields are excluded from the list response — fetch a single
 * post via /api/public/news/[slug] for the full body.
 */
export async function GET(request: NextRequest) {
  try {
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitRaw || "20", 10) || 20, 1), 100);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("news_posts")
      .select(
        "id, slug, title_mn, title_en, excerpt_mn, excerpt_en, cover_image_url, published_at"
      )
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/news]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
