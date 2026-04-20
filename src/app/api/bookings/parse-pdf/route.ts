import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropic, PDF_PARSE_MODEL } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth-guard";

// Route config — allow large PDFs and longer runtime
export const runtime = "nodejs";
export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Output schema from Claude
// ---------------------------------------------------------------------------

const parsedBookingSchema = z.object({
  trip_code: z.string().nullable().optional(),
  operator_name: z.string().nullable().optional(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tourist_count: z.number().int().nonnegative().default(0),
  staff_count: z.number().int().nonnegative().default(0),
  ger_1bed_count: z.number().int().nonnegative().default(0),
  ger_2bed_count: z.number().int().nonnegative().default(0),
  ger_staff_count: z.number().int().nonnegative().default(0),
  guide_name: z.string().nullable().optional(),
  guide_phone: z.string().nullable().optional(),
  meals: z.string().nullable().optional(),
  trip_type: z.string().nullable().optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).default("tentative"),
  notes: z.string().nullable().optional(),
});

const parseResponseSchema = z.object({
  operator: z
    .object({
      name: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      contact_person: z.string().nullable().optional(),
      contact_phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .optional(),
  bookings: z.array(parsedBookingSchema),
});

export type ParsedBooking = z.infer<typeof parsedBookingSchema>;
export type ParseResponse = z.infer<typeof parseResponseSchema> & {
  operator_id?: string | null;
};

// ---------------------------------------------------------------------------
// System prompt — cached across calls for cost savings
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You extract tour operator booking sheets from PDFs for Tsaidam Camp, a Mongolian tourist ger camp.

Each PDF is a seasonal booking sheet from ONE tour operator and contains MULTIPLE bookings (one per row in a table). Operators format their sheets differently — you must flexibly identify the columns.

For every booking row, extract:
- trip_code: the operator's internal code (e.g. "CHAM-2601", "CHAM 2609", "Ba-Rad-01"). Keep the operator's original formatting.
- check_in, check_out: ISO dates (YYYY-MM-DD). The PDF may use MM/DD, DD.MM, or MM-DD — infer the year from context (booking sheets are typically for the upcoming season; assume 2026 if unclear). check_out MUST be strictly after check_in.
- tourist_count: number of paying tourists
- staff_count: number of operator staff (guides, drivers, etc.)
- ger_1bed_count, ger_2bed_count, ger_staff_count: how many of each ger type is reserved
- guide_name, guide_phone: if listed
- meals: raw meal format string like "13+4" (13 tourist + 4 staff meals) if present
- trip_type: e.g. "Ba-Rad" / "bicycle tour" / "Дугуйн аялал" — blank for standard trips
- status: "cancelled" if the row is marked цуцлагдсан / cancelled, otherwise "tentative"
- notes: any remarks not captured above (short — 1 sentence max)

Also extract operator info from the PDF header (name, company, contact person, phone, email) into the top-level "operator" field.

Rules:
- NEVER invent data. If a field isn't present, use null (for strings) or 0 (for counts).
- If a date is ambiguous, use the context of surrounding rows to resolve it.
- Mongolian text is fine — preserve it verbatim in name/notes fields.
- Skip rows that are section headers, subtotals, or obviously not bookings.

Return ONLY a JSON object matching this exact schema (no markdown, no commentary):

{
  "operator": { "name": string|null, "company": string|null, "contact_person": string|null, "contact_phone": string|null, "email": string|null },
  "bookings": [
    {
      "trip_code": string|null,
      "operator_name": string|null,
      "check_in": "YYYY-MM-DD",
      "check_out": "YYYY-MM-DD",
      "tourist_count": int,
      "staff_count": int,
      "ger_1bed_count": int,
      "ger_2bed_count": int,
      "ger_staff_count": int,
      "guide_name": string|null,
      "guide_phone": string|null,
      "meals": string|null,
      "trip_type": string|null,
      "status": "confirmed"|"tentative"|"cancelled",
      "notes": string|null
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = await createClient();
    const auth = await requireUser(supabaseAuth);
    if (auth instanceof NextResponse) return auth;

    // -----------------------------------------------------------------------
    // Two input shapes:
    //   (1) multipart/form-data with a 'file' field (direct upload)
    //   (2) application/json with { intake_id } — load the stored email PDF
    // -----------------------------------------------------------------------
    let base64: string;
    let intakeId: string | null = null;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { intake_id?: string };
      if (!body.intake_id) {
        return NextResponse.json(
          { error: "intake_id is required when posting JSON" },
          { status: 400 }
        );
      }
      intakeId = body.intake_id;

      const supabase = await createClient();
      const { data: intake, error } = await supabase
        .from("email_intake")
        .select("attachment_base64, attachment_mime")
        .eq("id", intakeId)
        .single();

      if (error || !intake) {
        return NextResponse.json(
          { error: "Email intake row not found" },
          { status: 404 }
        );
      }
      if (!intake.attachment_base64) {
        return NextResponse.json(
          { error: "This email has no PDF attachment" },
          { status: 400 }
        );
      }
      if (
        intake.attachment_mime &&
        intake.attachment_mime !== "application/pdf"
      ) {
        return NextResponse.json(
          {
            error: `Unsupported attachment type: ${intake.attachment_mime}`,
          },
          { status: 400 }
        );
      }
      base64 = intake.attachment_base64;
    } else {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "No PDF file uploaded (expected 'file' field)" },
          { status: 400 }
        );
      }

      if (file.type !== "application/pdf") {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${file.type}. Expected application/pdf`,
          },
          { status: 400 }
        );
      }

      // 10 MB safety limit
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "PDF too large (max 10 MB)" },
          { status: 413 }
        );
      }

      const bytes = await file.arrayBuffer();
      base64 = Buffer.from(bytes).toString("base64");
    }

    // -----------------------------------------------------------------------
    // Call Claude with native PDF support + prompt caching on system prompt
    // -----------------------------------------------------------------------
    const anthropic = getAnthropic();

    const response = await anthropic.messages.create({
      model: PDF_PARSE_MODEL,
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extract every booking from this PDF and return the JSON object as specified. Today's date is 2026-04-17 — use 2026 for ambiguous dates.",
            },
          ],
        },
      ],
    });

    // Extract text content from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Claude returned no text content" },
        { status: 502 }
      );
    }

    // Strip markdown code fences if present
    const raw = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "");

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "Claude returned non-JSON response",
          raw: textBlock.text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const validated = parseResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "Claude response did not match expected schema",
          issues: validated.error.issues,
          raw: parsedJson,
        },
        { status: 502 }
      );
    }

    // -----------------------------------------------------------------------
    // Try to match operator by name (best-effort)
    // -----------------------------------------------------------------------
    let operator_id: string | null = null;
    const operatorName =
      validated.data.operator?.name ||
      validated.data.bookings[0]?.operator_name ||
      null;

    if (operatorName) {
      try {
        const supabase = await createClient();
        const { data: match } = await supabase
          .from("operators")
          .select("id, name")
          .ilike("name", `%${operatorName.slice(0, 20)}%`)
          .limit(1)
          .maybeSingle();
        if (match) operator_id = match.id;
      } catch {
        // non-fatal — admin can pick operator manually
      }
    }

    const result = {
      ...validated.data,
      operator_id,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens:
          response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      },
    };

    // Cache the parse result on the email_intake row so admins can revisit
    // without re-burning tokens
    if (intakeId) {
      try {
        const supabase = await createClient();
        await supabase
          .from("email_intake")
          .update({
            parse_result: result,
            operator_id: operator_id,
            status: "parsed",
            parse_error: null,
          })
          .eq("id", intakeId);
      } catch {
        // non-fatal — parse result still returned to caller
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF parsing failed: ${message}` },
      { status: 500 }
    );
  }
}
