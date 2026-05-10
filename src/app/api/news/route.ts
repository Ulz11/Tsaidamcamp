import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { newsPostInsertSchema } from "@/lib/validators";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("news_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/news]", err);
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
    const result = newsPostInsertSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    // If is_published flips to true and published_at is null, stamp it.
    const payload: Record<string, unknown> = { ...result.data };
    if (result.data.is_published && !result.data.published_at) {
      payload.published_at = new Date().toISOString();
    } else if (result.data.published_at instanceof Date) {
      payload.published_at = result.data.published_at.toISOString();
    }

    const { data, error } = await supabase
      .from("news_posts")
      .insert(payload)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[api/news POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
