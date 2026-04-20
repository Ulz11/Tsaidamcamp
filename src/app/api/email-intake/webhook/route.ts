import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook route — called by the Gmail forwarder (Apps Script / Zapier / etc.)
// Must use the service-role key because the caller isn't an authenticated
// admin user. Protected by a shared secret in the Authorization header.
//
// Expected auth:  Authorization: Bearer <EMAIL_INTAKE_SECRET>

export const runtime = "nodejs";
export const maxDuration = 30;

const webhookBodySchema = z.object({
  from_address: z.string().min(1),
  from_name: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  received_at: z.string().datetime().nullable().optional(),
  message_id: z.string().nullable().optional(),
  body_text: z.string().nullable().optional(),
  attachment: z
    .object({
      filename: z.string(),
      mime: z.string(),
      base64: z.string(),
    })
    .nullable()
    .optional(),
});

export async function POST(request: NextRequest) {
  // -----------------------------------------------------------------------
  // Auth
  // -----------------------------------------------------------------------
  const expected = process.env.EMAIL_INTAKE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "EMAIL_INTAKE_SECRET not configured on server" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // -----------------------------------------------------------------------
  // Parse body
  // -----------------------------------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = webhookBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // -----------------------------------------------------------------------
  // Insert with dedupe on message_id
  // -----------------------------------------------------------------------
  const supabase = createAdminClient();

  const row = {
    from_address: data.from_address,
    from_name: data.from_name ?? null,
    subject: data.subject ?? null,
    received_at: data.received_at ?? new Date().toISOString(),
    message_id: data.message_id ?? null,
    body_text: data.body_text ?? null,
    attachment_filename: data.attachment?.filename ?? null,
    attachment_mime: data.attachment?.mime ?? null,
    attachment_base64: data.attachment?.base64 ?? null,
    attachment_size_bytes: data.attachment
      ? Math.floor((data.attachment.base64.length * 3) / 4)
      : null,
    status: "pending" as const,
  };

  // If a message_id is given, upsert to avoid duplicates. Otherwise insert.
  if (data.message_id) {
    const { data: inserted, error } = await supabase
      .from("email_intake")
      .upsert(row, { onConflict: "message_id" })
      .select("id, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 });
  }

  const { data: inserted, error } = await supabase
    .from("email_intake")
    .insert(row)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id }, { status: 201 });
}
