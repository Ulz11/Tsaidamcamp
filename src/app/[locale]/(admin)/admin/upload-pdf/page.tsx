"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
// Types
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

type ParseResponse = {
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
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  };
};

type Operator = { id: string; name: string };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UploadPdfPage() {
  const t = useTranslations("admin.uploadPdf");
  const locale = useLocale();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiDisabled, setAiDisabled] = useState(false);

  const [rows, setRows] = useState<ParsedBooking[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const [dragOver, setDragOver] = useState(false);

  // Load operators once ---------------------------------------------------
  useEffect(() => {
    fetch("/api/operators")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Operator[]) => setOperators(data))
      .catch(() => {
        /* ignore */
      });
  }, []);

  // -----------------------------------------------------------------------
  // File handling
  // -----------------------------------------------------------------------
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type !== "application/pdf") {
      setError(`${t("parseError")}: ${f.type}`);
      return;
    }
    setFile(f);
    setError(null);
    setParsed(null);
    setRows([]);
    setSavedCount(null);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Parse
  // -----------------------------------------------------------------------
  async function handleParse() {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/bookings/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503 && data.code === "ai_disabled") {
          setAiDisabled(true);
        }
        setError(data.error || t("parseError"));
        return;
      }

      const typed = data as ParseResponse;
      setParsed(typed);
      setRows(typed.bookings);
      setSelectedOperatorId(typed.operator_id ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("parseError"));
    } finally {
      setParsing(false);
    }
  }

  // -----------------------------------------------------------------------
  // Row editing
  // -----------------------------------------------------------------------
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
      // Map parsed rows → bookingInsertSchema-compatible payloads.
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
          bookings: payloads,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("saveError"));
        return;
      }
      setSavedCount(data.inserted ?? rows.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  function handleStartOver() {
    setFile(null);
    setParsed(null);
    setRows([]);
    setError(null);
    setSavedCount(null);
    setSelectedOperatorId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Success state
  if (savedCount !== null) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <CheckCircle2 className="size-14 text-green-600" />
            <p className="text-lg font-medium">
              {t("savedSuccess", { count: savedCount })}
            </p>
            <Button onClick={handleStartOver} variant="outline">
              <RotateCcw className="mr-1.5 size-4" />
              {t("startOver")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Step 1: File upload zone */}
      {!parsed && (
        <Card>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-16 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <Upload className="size-10 text-muted-foreground" />
              <p className="text-center text-sm text-muted-foreground">
                {t("dropZone")}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {file && (
              <div className="mt-4 flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-muted-foreground" />
                  <div className="text-sm">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current)
                        fileInputRef.current.value = "";
                    }}
                  >
                    <XCircle className="size-4" />
                  </Button>
                  <Button onClick={handleParse} disabled={parsing}>
                    {parsing ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        {t("parsing")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1.5 size-4" />
                        {t("parseButton")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && !aiDisabled && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {error}
              </div>
            )}

            {aiDisabled && (
              <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950">
                <div className="font-medium text-amber-900 dark:text-amber-200">
                  AI parsing is off
                </div>
                <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
                  Add <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
                  <code className="font-mono">.env.local</code> and restart the
                  dev server to enable PDF parsing. In the meantime, you can add
                  bookings by hand.
                </p>
                <Link
                  href={`/${locale}/admin/bookings`}
                  className="mt-2 inline-flex items-center text-amber-900 underline hover:text-amber-700 dark:text-amber-200"
                >
                  Go to Bookings →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review & edit */}
      {parsed && (
        <>
          {/* Operator panel */}
          <Card size="sm">
            <CardContent className="space-y-3">
              {parsed.operator?.name && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    {t("parsedOperator")}:{" "}
                  </span>
                  <span className="font-medium">{parsed.operator.name}</span>
                  {parsed.operator.contact_person && (
                    <span className="text-muted-foreground">
                      {" — "}
                      {parsed.operator.contact_person}
                    </span>
                  )}
                  {parsed.operator.contact_phone && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({parsed.operator.contact_phone})
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-3">
                <div className="grid flex-1 gap-1.5">
                  <Label>
                    {t("operatorOverride")}
                    {!parsed.operator_id && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                      >
                        {t("operatorNotMatched")}
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
                  <p className="text-xs text-muted-foreground">
                    {t("operatorOverrideHelp")}
                  </p>
                </div>

                {parsed.usage && (
                  <div className="text-xs text-muted-foreground">
                    {t("usageTokens", {
                      input: parsed.usage.input_tokens,
                      output: parsed.usage.output_tokens,
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Review table */}
          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{t("reviewTitle")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("reviewSubtitle", { count: rows.length })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleStartOver}>
                    <RotateCcw className="mr-1.5 size-4" />
                    {t("startOver")}
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={saving || rows.length === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        {t("saving")}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 size-4" />
                        {t("saveAll")}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="mb-2 size-10 opacity-40" />
                  <p>{t("noBookingsFound")}</p>
                </div>
              ) : (
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
              )}

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
