import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { newsPostUpdateSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await request.json();
    const result = newsPostUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = { ...result.data };
    if (
      result.data.is_published === true &&
      result.data.published_at === undefined
    ) {
      // Fetch current row to see if published_at is already set.
      const { data: current } = await supabase
        .from("news_posts")
        .select("published_at")
        .eq("id", id)
        .single();
      if (!current?.published_at) {
        payload.published_at = new Date().toISOString();
      }
    } else if (result.data.published_at instanceof Date) {
      payload.published_at = result.data.published_at.toISOString();
    } else if (result.data.published_at === null) {
      payload.published_at = null;
    }

    const { data, error } = await supabase
      .from("news_posts")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/news/[id] PUT]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const { error } = await supabase
      .from("news_posts")
      .delete()
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/news/[id] DELETE]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
