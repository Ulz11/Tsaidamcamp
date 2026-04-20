import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";
import { transactionInsertSchema } from "@/lib/validators";

const bulkSchema = z.object({
  transactions: z.array(z.unknown()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const validated: unknown[] = [];
    const errors: Array<{ index: number; issues: unknown }> = [];

    parsed.data.transactions.forEach((raw, i) => {
      const r = transactionInsertSchema.safeParse(raw);
      if (r.success) validated.push(r.data);
      else errors.push({ index: i, issues: r.error.issues });
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Some rows failed validation", errors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert(validated)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(
      { inserted: data?.length ?? 0, transactions: data },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
