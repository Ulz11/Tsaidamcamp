"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Loader2,
  CalendarRange,
  Search,
  Check,
  ChevronDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BookingRow = {
  id: string;
  operator_id: string | null;
  trip_code: string | null;
  source: "operator" | "website" | "phone" | "walkin";
  status: "confirmed" | "tentative" | "cancelled";
  check_in: string;
  check_out: string;
  tourist_count: number;
  staff_count: number;
  guide_name: string | null;
  guide_phone: string | null;
  notes: string | null;
  payment_status: "unpaid" | "partial" | "paid";
  payment_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  operators?: { name: string } | null;
};

type Operator = { id: string; name: string };

type BookingFormData = {
  trip_code: string;
  source: BookingRow["source"];
  operator_id: string;
  check_in: string;
  check_out: string;
  tourist_count: number;
  staff_count: number;
  guide_name: string;
  guide_phone: string;
  notes: string;
  status: BookingRow["status"];
  payment_status: BookingRow["payment_status"];
  total_amount: number;
  payment_amount: number;
};

const EMPTY_FORM: BookingFormData = {
  trip_code: "",
  source: "operator",
  operator_id: "",
  check_in: "",
  check_out: "",
  tourist_count: 0,
  staff_count: 0,
  guide_name: "",
  guide_phone: "",
  notes: "",
  status: "tentative",
  payment_status: "unpaid",
  total_amount: 0,
  payment_amount: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatDateRange(a: string, b: string) {
  try {
    return `${format(new Date(a), "MMM d")} → ${format(new Date(b), "MMM d")}`;
  } catch {
    return `${a} → ${b}`;
  }
}

export const SOURCE_COLORS: Record<BookingRow["source"], string> = {
  operator: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  website: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  phone: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  walkin: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

export const STATUS_COLORS: Record<BookingRow["status"], string> = {
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  tentative: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  cancelled: "bg-red-100 text-red-800 line-through dark:bg-red-900/40 dark:text-red-300",
};

export const PAYMENT_COLORS: Record<BookingRow["payment_status"], string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

// Persist a few user preferences across sessions to skip re-entering common fields.
const PREFS_KEY = "tsaidam.booking.lastForm";

type LastFormPrefs = {
  source?: BookingRow["source"];
  operator_id?: string;
  status?: BookingRow["status"];
};

function loadPrefs(): LastFormPrefs {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function savePrefs(p: LastFormPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// BookingsList component
// ---------------------------------------------------------------------------

export function BookingsList({
  operators: operatorsProp,
  onBookingChange,
}: {
  operators?: Operator[];
  onBookingChange?: () => void;
}) {
  const t = useTranslations("booking");
  const tc = useTranslations("common");
  const toast = useToast();

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [operators, setOperators] = useState<Operator[]>(operatorsProp ?? []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingRow | null>(null);
  const [form, setForm] = useState<BookingFormData>(EMPTY_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/bookings?${params}`);
      if (res.ok) setBookings(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!operatorsProp) {
      fetch("/api/operators")
        .then((r) => r.json())
        .then(setOperators)
        .catch(() => {});
    }
  }, [operatorsProp]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter(
      (b) =>
        b.trip_code?.toLowerCase().includes(q) ||
        b.operators?.name?.toLowerCase().includes(q) ||
        b.guide_name?.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  function openAdd() {
    const prefs = loadPrefs();
    setEditingBooking(null);
    setForm({
      ...EMPTY_FORM,
      source: prefs.source ?? "operator",
      operator_id: prefs.operator_id ?? "",
      status: prefs.status ?? "tentative",
    });
    setShowAdvanced(false);
    setDialogOpen(true);
  }

  function openEdit(b: BookingRow) {
    setEditingBooking(b);
    setForm({
      trip_code: b.trip_code ?? "",
      source: b.source,
      operator_id: b.operator_id ?? "",
      check_in: b.check_in,
      check_out: b.check_out,
      tourist_count: b.tourist_count,
      staff_count: b.staff_count,
      guide_name: b.guide_name ?? "",
      guide_phone: b.guide_phone ?? "",
      notes: b.notes ?? "",
      status: b.status,
      payment_status: b.payment_status,
      total_amount: b.total_amount,
      payment_amount: b.payment_amount,
    });
    // Auto-show Advanced for edits when any advanced field has data
    setShowAdvanced(
      !!(b.guide_name || b.guide_phone || b.notes || b.payment_amount || b.total_amount)
    );
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (form.source !== "operator") payload.operator_id = null;
      if (!form.operator_id) payload.operator_id = null;
      if (!form.trip_code) payload.trip_code = null;
      if (!form.guide_name) payload.guide_name = null;
      if (!form.guide_phone) payload.guide_phone = null;
      if (!form.notes) payload.notes = null;

      const url = editingBooking ? `/api/bookings/${editingBooking.id}` : "/api/bookings";
      const method = editingBooking ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        savePrefs({
          source: form.source,
          operator_id: form.source === "operator" ? form.operator_id : "",
          status: form.status,
        });
        setDialogOpen(false);
        fetchBookings();
        onBookingChange?.();
        toast.show({
          message: tc("saved"),
          variant: "success",
        });
      }
    } catch {
      toast.show({ message: tc("actionFailed"), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(b: BookingRow) {
    // Optimistic remove from local state, commit on toast expiry.
    setBookings((prev) => prev.filter((x) => x.id !== b.id));
    toast.show({
      message: tc("deleted"),
      description: b.trip_code || b.operators?.name || tc("deletedDesc"),
      variant: "default",
      undo: {
        label: tc("undo"),
        onUndo: () => {
          setBookings((prev) => [b, ...prev]);
        },
        onCommit: async () => {
          const res = await fetch(`/api/bookings/${b.id}`, { method: "DELETE" });
          if (!res.ok) {
            // Server rejected → roll back optimistic remove.
            setBookings((prev) => [b, ...prev]);
            toast.show({ message: tc("actionFailed"), variant: "error" });
          } else {
            onBookingChange?.();
          }
        },
      },
    });
  }

  /** PATCH a single field on a booking with optimistic UI. */
  async function patchBooking(b: BookingRow, patch: Partial<BookingRow>) {
    const previous = bookings;
    setBookings((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, ...patch } : x))
    );
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        setBookings(previous);
        toast.show({ message: tc("actionFailed"), variant: "error" });
        return false;
      }
      onBookingChange?.();
      return true;
    } catch {
      setBookings(previous);
      toast.show({ message: tc("actionFailed"), variant: "error" });
      return false;
    }
  }

  async function quickMarkPaid(b: BookingRow) {
    const ok = await patchBooking(b, {
      payment_status: "paid",
      payment_amount: b.total_amount || b.payment_amount,
    });
    if (ok) toast.show({ message: tc("markedPaid"), variant: "success" });
  }

  async function quickConfirm(b: BookingRow) {
    const ok = await patchBooking(b, { status: "confirmed" });
    if (ok) toast.show({ message: tc("markedConfirmed"), variant: "success" });
  }

  function upd<K extends keyof BookingFormData>(k: K, v: BookingFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const sourceLabel = (s: BookingRow["source"]) =>
    ({ operator: t("sourceOperator"), website: t("sourceWebsite"), phone: t("sourcePhone"), walkin: t("sourceWalkin") })[s];
  const statusLabel = (s: BookingRow["status"]) =>
    ({ confirmed: t("statusConfirmed"), tentative: t("statusTentative"), cancelled: t("statusCancelled") })[s];
  const paymentLabel = (s: BookingRow["payment_status"]) =>
    ({ unpaid: t("paymentUnpaid"), partial: t("paymentPartial"), paid: t("paymentPaid") })[s];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={sourceFilter} onValueChange={setSourceFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="operator">{t("sourceOperator")}</TabsTrigger>
              <TabsTrigger value="website">{t("sourceWebsite")}</TabsTrigger>
              <TabsTrigger value="phone">{t("sourcePhone")}</TabsTrigger>
              <TabsTrigger value="walkin">{t("sourceWalkin")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-1">
            {(["all", "confirmed", "tentative", "cancelled"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium transition-all ring-offset-0 ${
                  statusFilter === s
                    ? s === "all"
                      ? "bg-primary text-primary-foreground"
                      : STATUS_COLORS[s as BookingRow["status"]]
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                } ${statusFilter === s ? "ring-2 ring-ring/30" : ""}`}
              >
                {s === "all" ? "All" : statusLabel(s as BookingRow["status"])}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <CalendarRange className="size-4 text-muted-foreground" />
            <Input type="date" className="w-32" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span className="text-muted-foreground">–</span>
            <Input type="date" className="w-32" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="w-48 pl-8" placeholder={`${tc("search")}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-1.5 size-4" />
            {t("addBooking")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarRange className="mb-2 size-10 opacity-40" />
              <p>No bookings found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("tripCode")}</TableHead>
                  <TableHead>{tc("date")}</TableHead>
                  <TableHead>{t("source")}</TableHead>
                  <TableHead>{t("touristCount")}/{t("staffCount")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{t("paymentStatus")}</TableHead>
                  <TableHead>{t("sourceOperator")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">{b.trip_code || "—"}</TableCell>
                    <TableCell>{formatDateRange(b.check_in, b.check_out)}</TableCell>
                    <TableCell>
                      <Badge className={SOURCE_COLORS[b.source]} variant="secondary">{sourceLabel(b.source)}</Badge>
                    </TableCell>
                    <TableCell>{b.tourist_count}+{b.staff_count}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[b.status]} variant="secondary">{statusLabel(b.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PAYMENT_COLORS[b.payment_status]} variant="secondary">{paymentLabel(b.payment_status)}</Badge>
                    </TableCell>
                    <TableCell>{b.operators?.name || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Inline quick actions */}
                        {b.status === "tentative" && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => quickConfirm(b)}
                                  className="text-green-700 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950/40"
                                />
                              }
                            >
                              <Check className="size-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>{tc("markConfirmed")}</TooltipContent>
                          </Tooltip>
                        )}
                        {b.payment_status !== "paid" && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => quickMarkPaid(b)}
                                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                />
                              }
                            >
                              <span className="text-xs font-bold">$</span>
                            </TooltipTrigger>
                            <TooltipContent>{tc("markPaid")}</TooltipContent>
                          </Tooltip>
                        )}
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(b)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                            <MoreHorizontal className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(b)}>
                              <Pencil className="mr-1.5 size-3.5" />{tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(b)}>
                              <Trash2 className="mr-1.5 size-3.5" />{tc("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog — Essentials + collapsible Advanced */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBooking ? t("editBooking") : t("addBooking")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* ── Essentials ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("checkIn")}</Label>
                <Input type="date" value={form.check_in} onChange={(e) => upd("check_in", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("checkOut")}</Label>
                <Input type="date" value={form.check_out} onChange={(e) => upd("check_out", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("touristCount")}</Label>
                <Input type="number" min={0} value={form.tourist_count} onChange={(e) => upd("tourist_count", Number(e.target.value) || 0)} />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("staffCount")}</Label>
                <Input type="number" min={0} value={form.staff_count} onChange={(e) => upd("staff_count", Number(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{t("source")}</Label>
              <Select value={form.source} onValueChange={(v) => upd("source", v as BookingRow["source"])}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">{t("sourceOperator")}</SelectItem>
                  <SelectItem value="website">{t("sourceWebsite")}</SelectItem>
                  <SelectItem value="phone">{t("sourcePhone")}</SelectItem>
                  <SelectItem value="walkin">{t("sourceWalkin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.source === "operator" && (
              <div className="grid gap-1.5">
                <Label>{t("sourceOperator")}</Label>
                <Select value={form.operator_id} onValueChange={(v) => upd("operator_id", v ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select operator..." /></SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("tripCode")}</Label>
                <Input value={form.trip_code} onChange={(e) => upd("trip_code", e.target.value)} placeholder="CHAM-2601" />
              </div>
              <div className="grid gap-1.5">
                <Label>{tc("status")}</Label>
                <Select value={form.status} onValueChange={(v) => upd("status", v as BookingRow["status"])}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">{t("statusConfirmed")}</SelectItem>
                    <SelectItem value="tentative">{t("statusTentative")}</SelectItem>
                    <SelectItem value="cancelled">{t("statusCancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Advanced (collapsed by default) ── */}
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={`size-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              {tc("advanced")}
            </button>

            {showAdvanced && (
              <div className="grid gap-4 border-l-2 border-muted pl-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>{t("guideName")}</Label>
                    <Input value={form.guide_name} onChange={(e) => upd("guide_name", e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("guidePhone")}</Label>
                    <Input value={form.guide_phone} onChange={(e) => upd("guide_phone", e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>{tc("notes")}</Label>
                  <Textarea value={form.notes} onChange={(e) => upd("notes", e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label>{t("paymentStatus")}</Label>
                    <Select value={form.payment_status} onValueChange={(v) => upd("payment_status", v as BookingRow["payment_status"])}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">{t("paymentUnpaid")}</SelectItem>
                        <SelectItem value="partial">{t("paymentPartial")}</SelectItem>
                        <SelectItem value="paid">{t("paymentPaid")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{tc("total")}</Label>
                    <Input type="number" min={0} value={form.total_amount} onChange={(e) => upd("total_amount", Number(e.target.value) || 0)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Paid</Label>
                    <Input type="number" min={0} value={form.payment_amount} onChange={(e) => upd("payment_amount", Number(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{tc("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.check_in || !form.check_out}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}{tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
