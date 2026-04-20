"use client";

import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Paperclip,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types (must mirror parse-pdf route's ParseResponse)
// ---------------------------------------------------------------------------

type ParsedBooking = {
  trip_code: string | null;
  operator_name: string | null;
  check_in: string;
  check_out: string;
  tourist_count: number;
  staff_count: number;
  ger_1bed_count: number;
  ger_2bed_count: number;
  ger_staff_count: number;
  guide_name: string | null;
  guide_phone: string | null;
  meals: string | null;
  trip_type: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  notes: string | null;
};

type ParseResult = {
  operator?: {
    name?: string | null;
    company?: string | null;
    contact_person?: string | null;
    contact_phone?: string | null;
    email?: string | null;
  };
  operator_id?: string | null;
  bookings: ParsedBooking[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
};

type EmailIntake = {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  body_text: string | null;
  attachment_filename: string | null;
  attachment_mime: string | null;
  attachment_size_bytes: number | null;
  status: "pending" | "parsed" | "imported" | "ignored" | "error";
  operator_id: string | null;
  parse_result: ParseResult | null;
  parse_error: string | null;
  imported_booking_count: number;
  operators?: { name: string } | null;
};

type Operator = { id: string; name: string };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InboxDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("admin.inbox");
  const tu = useTranslations("admin.uploadPdf");
  const tc = useTranslations("common");
  const router = useRouter();

  const [email, setEmail] = useState<EmailIntake | null>(null);
  const [loading, setLoading] = useState(true);

  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<ParsedBooking[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  const [saving, setSaving] = useState(false);

  const hydrateFromEmail = useCallback((em: EmailIntake) => {
    if (em.parse_result) {
      setRows(em.parse_result.bookings);
      setSelectedOperatorId(
        em.operator_id || em.parse_result.operator_id || ""
      );
    } else {
      setRows([]);
      setSelectedOperatorId(em.operator_id || "");
    }
  }, []);

  // Load email + operators in parallel
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [emailRes, operatorsRes] = await Promise.all([
        fetch(`/api/email-intake/${id}`),
        fetch("/api/operators"),
      ]);
      if (emailRes.ok) {
        const em: EmailIntake = await emailRes.json();
        setEmail(em);
        hydrateFromEmail(em);
      }
      if (operatorsRes.ok) setOperators(await operatorsRes.json());
      setLoading(false);
    })();
  }, [id, hydrateFromEmail]);

  // -----------------------------------------------------------------------
  // Parse (or re-parse)
  // -----------------------------------------------------------------------
  async function handleParse() {
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake_id: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || tu("parseError"));
        return;
      }
      const typed = data as ParseResult;
      setRows(typed.bookings);
      setSelectedOperatorId(typed.operator_id || "");
      // refresh email row so cached parse_result/status update in UI
      const refreshed = await fetch(`/api/email-intake/${id}`);
      if (refreshed.ok) setEmail(await refreshed.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : tu("parseError"));
    } finally {
      setParsing(false);
    }
  }

  function updateRow<K extends keyof ParsedBooking>(
    index: number,
    key: K,
    value: ParsedBooking[K]
  ) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------
  async function handleSaveAll() {
    if (rows.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const payloads = rows.map((r) => ({
        source: "operator" as const,
        status: r.status,
        trip_code: r.trip_code || undefined,
        check_in: r.check_in,
        check_out: r.check_out,
        tourist_count: r.tourist_count,
        staff_count: r.staff_count,
        guide_name: r.guide_name || undefined,
        guide_phone: r.guide_phone || undefined,
        notes: [r.trip_type, r.meals ? `meals: ${r.meals}` : null, r.notes]
          .filter(Boolean)
          .join(" — ") || undefined,
      }));

      const res = await fetch("/api/bookings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_id: selectedOperatorId || null,
          intake_id: id,
          bookings: payloads,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || tu("saveError"));
        return;
      }
      router.push("/admin/inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : tu("saveError"));
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Link
          href="/admin/inbox"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          {tc("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/inbox"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          {tc("back")}
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">
          {email.subject || "(no subject)"}
        </h2>
      </div>

      {/* Email metadata */}
      <Card size="sm">
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Mail className="mt-0.5 size-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">
                {email.from_name || email.from_address}
              </div>
              {email.from_name && (
                <div className="text-xs text-muted-foreground">
                  {email.from_address}
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(email.received_at), "MMM d, yyyy HH:mm")}
            </div>
          </div>

          {email.attachment_filename && (
            <div className="flex items-center gap-2 text-sm">
              <Paperclip className="size-4 text-muted-foreground" />
              <span>{email.attachment_filename}</span>
              {email.attachment_size_bytes != null && (
                <span className="text-xs text-muted-foreground">
                  ({Math.round(email.attachment_size_bytes / 1024)} KB)
                </span>
              )}
            </div>
          )}

          {email.body_text && (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">
                {t("showBody")}
              </summary>
              <pre className="mt-2 max-h-64 whitespace-pre-wrap rounded bg-muted/30 p-3 text-xs">
                {email.body_text}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Parse / re-parse action */}
      {rows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-center text-muted-foreground">
              {t("notParsedYet")}
            </p>
            <Button onClick={handleParse} disabled={parsing}>
              {parsing ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  {tu("parsing")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 size-4" />
                  {tu("parseButton")}
                </>
              )}
            </Button>
            {error && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Review & edit */}
      {rows.length > 0 && (
        <>
          <Card size="sm">
            <CardContent className="space-y-3">
              {email.parse_result?.operator?.name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {tu("parsedOperator")}:{" "}
                  </span>
                  <span className="font-medium">
                    {email.parse_result.operator.name}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-end gap-3">
                <div className="grid flex-1 gap-1.5">
                  <Label>
                    {tu("operatorOverride")}
                    {!selectedOperatorId && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                      >
                        {tu("operatorNotMatched")}
                      </Badge>
                    )}
                  </Label>
                  <Select
                    value={selectedOperatorId || undefined}
                    onValueChange={(v) => setSelectedOperatorId(v as string)}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Select operator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {email.parse_result?.usage && (
                  <div className="text-xs text-muted-foreground">
                    {tu("usageTokens", {
                      input: email.parse_result.usage.input_tokens,
                      output: email.parse_result.usage.output_tokens,
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {tu("reviewTitle")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {tu("reviewSubtitle", { count: rows.length })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleParse}
                    disabled={parsing}
                  >
                    {parsing ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1.5 size-4" />
                    )}
                    {t("reparse")}
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={saving || rows.length === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        {tu("saving")}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 size-4" />
                        {tu("saveAll")}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-28">Trip code</TableHead>
                      <TableHead className="min-w-32">Check-in</TableHead>
                      <TableHead className="min-w-32">Check-out</TableHead>
                      <TableHead className="min-w-20">Tourists</TableHead>
                      <TableHead className="min-w-20">Staff</TableHead>
                      <TableHead className="min-w-32">Guide</TableHead>
                      <TableHead className="min-w-28">Status</TableHead>
                      <TableHead className="min-w-48">Notes</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input
                            className="h-8 font-mono text-xs"
                            value={row.trip_code ?? ""}
                            onChange={(e) =>
                              updateRow(i, "trip_code", e.target.value || null)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="date"
                            value={row.check_in}
                            onChange={(e) =>
                              updateRow(i, "check_in", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            type="date"
                            value={row.check_out}
                            onChange={(e) =>
                              updateRow(i, "check_out", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-16"
                            type="number"
                            min={0}
                            value={row.tourist_count}
                            onChange={(e) =>
                              updateRow(
                                i,
                                "tourist_count",
                                Number(e.target.value) || 0
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-16"
                            type="number"
                            min={0}
                            value={row.staff_count}
                            onChange={(e) =>
                              updateRow(
                                i,
                                "staff_count",
                                Number(e.target.value) || 0
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            placeholder="—"
                            value={row.guide_name ?? ""}
                            onChange={(e) =>
                              updateRow(
                                i,
                                "guide_name",
                                e.target.value || null
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.status}
                            onValueChange={(v) =>
                              updateRow(
                                i,
                                "status",
                                v as ParsedBooking["status"]
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tentative">
                                Tentative
                              </SelectItem>
                              <SelectItem value="confirmed">
                                Confirmed
                              </SelectItem>
                              <SelectItem value="cancelled">
                                Cancelled
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8"
                            value={
                              [
                                row.trip_type,
                                row.meals ? `meals: ${row.meals}` : null,
                                row.notes,
                              ]
                                .filter(Boolean)
                                .join(" — ") || ""
                            }
                            onChange={(e) =>
                              updateRow(i, "notes", e.target.value || null)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeRow(i)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {error && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
