import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { z } from "zod";

const PositionItem = z.object({
  id: z.string().uuid(),
  pos_x: z.number(),
  pos_y: z.number(),
});

const PositionsPayload = z.object({
  positions: z.array(PositionItem).min(1),
});

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();

    const result = PositionsPayload.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const errors: string[] = [];

    for (const pos of result.data.positions) {
      const { error } = await supabase
        .from("gers")
        .update({ pos_x: pos.pos_x, pos_y: pos.pos_y })
        .eq("id", pos.id);

      if (error) {
        errors.push(`Failed to update ger ${pos.id}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Some updates failed", details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
