"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  CalendarDays,
  Users,
  CreditCard,
  Phone,
  Bed as BedIcon,
  X,
  GripVertical,
  ChevronDown,
  CalendarPlus,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BookingsList } from "@/components/admin/bookings-list";
import type { GerRow, GerInsert, Bed } from "@/lib/validators";
import {
  formatDateRange,
  STATUS_COLORS,
  PAYMENT_COLORS,
} from "@/components/admin/bookings-list";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActiveBooking = {
  id: string;
  trip_code: string | null;
  check_in: string;
  check_out: string;
  tourist_count: number;
  staff_count: number;
  guide_name: string | null;
  guide_phone: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  payment_status: "unpaid" | "partial" | "paid";
  total_amount: number;
  payment_amount: number;
  operators: { name: string } | null;
};

type BookingState =
  | "available"
  | "occupied"
  | "checking_out_today"
  | "arriving_soon"
  | "cleaning";

type EnrichedGer = GerRow & {
  active_booking: ActiveBooking | null;
  next_booking: ActiveBooking | null;
  booking_state: Exclude<BookingState, "cleaning">;
};

type GerBooking = ActiveBooking & {
  notes: string | null;
  source: string;
  created_at: string;
};

type UnassignedBooking = {
  id: string;
  trip_code: string | null;
  source: "operator" | "website" | "phone" | "walkin";
  status: "confirmed" | "tentative";
  check_in: string;
  check_out: string;
  tourist_count: number;
  staff_count: number;
  payment_status: "unpaid" | "partial" | "paid";
  total_amount: number;
  payment_amount: number;
  operators: { name: string } | null;
};

type GerType = GerRow["type"];

// ---------------------------------------------------------------------------
// Bed presets — front-end editable, expandable via "Custom"
// ---------------------------------------------------------------------------

const BED_PRESETS = [
  { value: "single", labelKey: "bedSingle" },
  { value: "double", labelKey: "bedDouble" },
  { value: "queen", labelKey: "bedQueen" },
  { value: "king", labelKey: "bedKing" },
  { value: "bunk", labelKey: "bedBunk" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEffectiveState(ger: EnrichedGer): BookingState {
  if (ger.booking_state === "available" && !ger.is_available) return "cleaning";
  return ger.booking_state;
}

function getStatusBg(state: BookingState): string {
  return {
    occupied: "bg-rose-100 dark:bg-rose-900/40",
    checking_out_today: "bg-orange-100 dark:bg-orange-900/40",
    arriving_soon: "bg-sky-100 dark:bg-sky-900/40",
    cleaning: "bg-amber-100 dark:bg-amber-900/40",
    available: "bg-emerald-100 dark:bg-emerald-900/40",
  }[state];
}

function getDotColor(state: BookingState): string {
  return {
    occupied: "bg-rose-500",
    checking_out_today: "bg-orange-500",
    arriving_soon: "bg-sky-500",
    cleaning: "bg-amber-500",
    available: "bg-emerald-500",
  }[state];
}

function getBorderStyle(type: GerType): string {
  return (
    {
      deluxe: "border-amber-500",
      "2-bed": "border-blue-500",
      "1-bed": "border-green-500",
      staff: "border-gray-400",
    }[type]
  );
}

function getShape(type: GerType): string {
  return type === "staff" ? "rounded-md" : "rounded-full";
}

// Map area_sqm → on-canvas pixel diameter. Linear scale, clamped.
function getSize(ger: GerRow): number {
  const area = ger.area_sqm ?? null;
  if (area && area > 0) {
    // 12 m² → 40 px ; 40 m² → 110 px (linear)
    const px = 40 + ((area - 12) * (110 - 40)) / (40 - 12);
    return Math.max(36, Math.min(120, Math.round(px)));
  }
  // Fallback to type-based size when area not configured.
  return { deluxe: 80, "2-bed": 64, "1-bed": 52, staff: 44 }[ger.type];
}

function isEnvConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (!/^https?:\/\//i.test(url.trim())) return false;
  if (url.includes("your-supabase") || key.includes("your-supabase")) return false;
  return true;
}

const EMPTY_FORM: GerInsert = {
  name: "",
  type: "2-bed",
  capacity: 2,
  price_per_night: undefined,
  is_available: true,
  description_mn: undefined,
  description_en: undefined,
  sort_order: undefined,
  image_url: undefined,
  pos_x: 0,
  pos_y: 0,
  width: 60,
  height: 60,
  area_sqm: undefined,
  beds: [],
};

// ---------------------------------------------------------------------------
// Bed editor
// ---------------------------------------------------------------------------

function BedsEditor({
  beds,
  onChange,
}: {
  beds: Bed[];
  onChange: (beds: Bed[]) => void;
}) {
  const t = useTranslations("ger");

  function update(i: number, patch: Partial<Bed>) {
    onChange(beds.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function remove(i: number) {
    onChange(beds.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...beds, { size: "single", count: 1 }]);
  }

  const isPreset = (size: string) =>
    BED_PRESETS.some((p) => p.value === size);

  return (
    <div className="space-y-2">
      {beds.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("noBeds")}</p>
      )}
      {beds.map((b, i) => {
        const usingCustom = !isPreset(b.size);
        return (
          <div key={i} className="flex items-center gap-2">
            <Select
              value={usingCustom ? "__custom" : b.size}
              onValueChange={(v) => {
                if (v === "__custom") update(i, { size: "" });
                else update(i, { size: v ?? "single" });
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BED_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {t(p.labelKey)}
                  </SelectItem>
                ))}
                <SelectItem value="__custom">{t("bedCustom")}</SelectItem>
              </SelectContent>
            </Select>
            {usingCustom && (
              <Input
                className="flex-1"
                value={b.size}
                onChange={(e) => update(i, { size: e.target.value })}
                placeholder={t("bedCustomPlaceholder")}
              />
            )}
            <Input
              type="number"
              min={1}
              className="w-20"
              value={b.count}
              onChange={(e) =>
                update(i, { count: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              aria-label={t("bedCount")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => remove(i)}
              aria-label="remove"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1.5 size-3.5" />
        {t("addBed")}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable elements
// ---------------------------------------------------------------------------

function DraggableGer({
  ger,
  onSelect,
  isDropTarget,
}: {
  ger: EnrichedGer;
  onSelect: () => void;
  isDropTarget: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } =
    useDraggable({ id: `ger:${ger.id}`, data: { kind: "ger", gerId: ger.id } });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `gerdrop:${ger.id}`,
    data: { kind: "ger", gerId: ger.id },
  });

  const state = getEffectiveState(ger);
  const size = getSize(ger);

  const style: React.CSSProperties = {
    position: "absolute",
    left: ger.pos_x,
    top: ger.pos_y,
    width: size,
    height: size,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    cursor: isDragging ? "grabbing" : "pointer",
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={(node) => {
        setDragRef(node);
        setDropRef(node);
      }}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      className={[
        "flex items-center justify-center border-2 text-xs font-bold select-none",
        "shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-primary/40",
        getBorderStyle(ger.type),
        getShape(ger.type),
        getStatusBg(state),
        isDragging ? "opacity-80 shadow-lg" : "",
        isDropTarget && isOver ? "ring-4 ring-primary scale-110" : "",
      ].join(" ")}
      title={`${ger.name} (${ger.type}${
        ger.area_sqm ? ` · ${ger.area_sqm} m²` : ""
      }) — ${state}`}
    >
      <span className="pointer-events-none text-center leading-tight text-[10px]">
        {ger.name}
      </span>
      {state !== "available" && (
        <span
          className={`pointer-events-none absolute -top-1 -right-1 size-2.5 rounded-full ring-1 ring-white ${getDotColor(state)}`}
        />
      )}
    </div>
  );
}

function DraggableBookingChip({
  booking,
}: {
  booking: UnassignedBooking;
}) {
  const tb = useTranslations("booking");
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `booking:${booking.id}`,
      data: { kind: "booking", bookingId: booking.id },
    });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    zIndex: isDragging ? 60 : "auto",
  };

  const sourceLabel =
    booking.source === "operator"
      ? tb("sourceOperator")
      : booking.source === "website"
        ? tb("sourceWebsite")
        : booking.source === "phone"
          ? tb("sourcePhone")
          : tb("sourceWalkin");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        "group flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs shadow-sm",
        "cursor-grab active:cursor-grabbing hover:border-primary/60 hover:shadow",
        isDragging ? "opacity-90 shadow-lg ring-2 ring-primary" : "",
      ].join(" ")}
    >
      <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold truncate">
            {booking.trip_code || booking.operators?.name || sourceLabel}
          </span>
          <Badge
            className={STATUS_COLORS[booking.status]}
            variant="secondary"
          >
            {booking.status === "confirmed"
              ? tb("statusConfirmed")
              : tb("statusTentative")}
          </Badge>
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
          <span>{formatDateRange(booking.check_in, booking.check_out)}</span>
          <span>·</span>
          <span>
            {booking.tourist_count}+{booking.staff_count} pax
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GerDetailSheet
// ---------------------------------------------------------------------------

function GerDetailSheet({
  ger,
  open,
  autoOpenBooking,
  onClose,
  onEdit,
  onDelete,
  onBookingCreated,
}: {
  ger: EnrichedGer | null;
  open: boolean;
  autoOpenBooking?: boolean;
  onClose: () => void;
  onEdit: (g: EnrichedGer) => void;
  onDelete: (g: EnrichedGer) => void;
  onBookingCreated: () => void;
}) {
  const t = useTranslations("ger");
  const tb = useTranslations("booking");
  const tc = useTranslations("common");
  const toast = useToast();

  const [gerBookings, setGerBookings] = useState<GerBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [operators, setOperators] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open && autoOpenBooking) setBookingDialogOpen(true);
  }, [open, autoOpenBooking]);

  const [bForm, setBForm] = useState({
    trip_code: "",
    source: "operator" as "operator" | "website" | "phone" | "walkin",
    operator_id: null as string | null,
    check_in: "",
    check_out: "",
    tourist_count: 0,
    staff_count: 0,
    guide_name: "",
    guide_phone: "",
    notes: "",
    status: "tentative" as "confirmed" | "tentative" | "cancelled",
    payment_status: "unpaid" as "unpaid" | "partial" | "paid",
    total_amount: 0,
    payment_amount: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ger || !open) return;
    setLoadingBookings(true);
    fetch(`/api/gers/${ger.id}/bookings`)
      .then((r) => r.json())
      .then(setGerBookings)
      .catch(() => {})
      .finally(() => setLoadingBookings(false));
  }, [ger, open]);

  useEffect(() => {
    fetch("/api/operators")
      .then((r) => r.json())
      .then(setOperators)
      .catch(() => {});
  }, []);

  if (!ger) return null;

  const state = getEffectiveState(ger);
  const ab = ger.active_booking;
  const next = ger.next_booking;

  const stateLabel = {
    occupied: t("stateOccupied"),
    checking_out_today: t("stateCheckingOutToday"),
    arriving_soon: t("stateArrivingSoon"),
    cleaning: t("stateCleaning"),
    available: t("stateAvailable"),
  }[state];

  const stateBadge = (
    <Badge className={`${getStatusBg(state)} text-foreground`}>
      <span className={`mr-1.5 inline-block size-1.5 rounded-full ${getDotColor(state)}`} />
      {stateLabel}
    </Badge>
  );

  async function submitBooking() {
    if (!ger) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...bForm,
        operator_id:
          bForm.source === "operator" && bForm.operator_id
            ? bForm.operator_id
            : null,
        trip_code: bForm.trip_code || null,
        guide_name: bForm.guide_name || null,
        guide_phone: bForm.guide_phone || null,
        notes: bForm.notes || null,
      };
      const res = await fetch(`/api/gers/${ger.id}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setBookingDialogOpen(false);
        toast.show({ message: tc("saved"), variant: "success" });
        onBookingCreated();
        const updated = await fetch(`/api/gers/${ger.id}/bookings`)
          .then((r) => r.json())
          .catch(() => []);
        setGerBookings(updated);
        setBForm({
          trip_code: "",
          source: "operator",
          operator_id: null,
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
        });
      }
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = gerBookings.filter((b) => b.check_in > today);
  const past = gerBookings.filter((b) => b.check_out <= today);

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto p-0"
        >
          <SheetHeader className="p-4 pb-0">
            <div className="flex items-start justify-between gap-2 pr-8">
              <div>
                <SheetTitle className="text-xl">{ger.name}</SheetTitle>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {stateBadge}
                  <Badge variant="secondary">{ger.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {t("capacity")}: {ger.capacity}
                  </span>
                  {ger.area_sqm != null && (
                    <span className="text-xs text-muted-foreground">
                      {Number(ger.area_sqm)} m²
                    </span>
                  )}
                  {ger.price_per_night != null && (
                    <span className="text-xs text-muted-foreground">
                      {Number(ger.price_per_night).toLocaleString()}{" "}
                      {tc("currency")}/night
                    </span>
                  )}
                </div>
                {ger.beds && ger.beds.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <BedIcon className="size-3.5" />
                    {ger.beds.map((b, i) => (
                      <span key={i} className="rounded bg-muted px-1.5 py-0.5">
                        {b.count}× {b.size}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(ger)}>
                <Pencil className="mr-1.5 size-3.5" />
                {tc("edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(ger)}>
                <Trash2 className="mr-1.5 size-3.5" />
                {tc("delete")}
              </Button>
              <Button
                size="sm"
                onClick={() => setBookingDialogOpen(true)}
                className="ml-auto"
              >
                <Plus className="mr-1.5 size-3.5" />
                {t("bookThisGer")}
              </Button>
            </div>
          </SheetHeader>

          <Separator className="my-4" />

          <div className="px-4 space-y-6 pb-8">
            {ab && (
              <section>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-rose-500" />
                  {t("currentBooking")}
                </h3>
                <div className="rounded-lg border bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {ab.trip_code || ab.operators?.name || "—"}
                      </div>
                      {ab.trip_code && ab.operators?.name && (
                        <div className="text-xs text-muted-foreground">
                          {ab.operators.name}
                        </div>
                      )}
                    </div>
                    <Badge
                      className={STATUS_COLORS[ab.status]}
                      variant="secondary"
                    >
                      {ab.status === "confirmed"
                        ? tb("statusConfirmed")
                        : tb("statusTentative")}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm">
                    <CalendarDays className="size-3.5 text-muted-foreground" />
                    {formatDateRange(ab.check_in, ab.check_out)}
                  </div>

                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span>
                      {ab.tourist_count} {t("tourists")} + {ab.staff_count}{" "}
                      {t("staff")}
                    </span>
                  </div>

                  {ab.guide_name && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span>{ab.guide_name}</span>
                      {ab.guide_phone && (
                        <span className="text-muted-foreground">
                          {ab.guide_phone}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-sm">
                    <CreditCard className="size-3.5 text-muted-foreground" />
                    <Badge
                      className={PAYMENT_COLORS[ab.payment_status]}
                      variant="secondary"
                    >
                      {ab.payment_status === "paid"
                        ? tb("paymentPaid")
                        : ab.payment_status === "partial"
                          ? tb("paymentPartial")
                          : tb("paymentUnpaid")}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {Number(ab.payment_amount).toLocaleString()} /{" "}
                      {Number(ab.total_amount).toLocaleString()} {tc("currency")}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {!ab && next && (
              <section>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-sky-500" />
                  {t("stateArrivingSoon")}
                </h3>
                <div className="rounded-lg border bg-sky-50/50 dark:bg-sky-950/20 p-4 text-sm">
                  <div className="font-semibold">
                    {next.trip_code || next.operators?.name || "—"}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {formatDateRange(next.check_in, next.check_out)} ·{" "}
                    {next.tourist_count}+{next.staff_count} pax
                  </div>
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-3">
                  Upcoming ({upcoming.length})
                </h3>
                <div className="space-y-2">
                  {upcoming.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-md border p-3 text-sm space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {b.trip_code || b.operators?.name || "—"}
                        </span>
                        <Badge
                          className={STATUS_COLORS[b.status]}
                          variant="secondary"
                        >
                          {b.status === "confirmed"
                            ? tb("statusConfirmed")
                            : tb("statusTentative")}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-xs flex items-center gap-3">
                        <span>{formatDateRange(b.check_in, b.check_out)}</span>
                        <span>
                          {b.tourist_count}+{b.staff_count} pax
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                  {t("allGerBookings")} — past ({past.length})
                </h3>
                <div className="space-y-1.5">
                  {past.slice(0, 5).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between text-xs text-muted-foreground border rounded px-3 py-2"
                    >
                      <span>{b.trip_code || b.operators?.name || "—"}</span>
                      <span>{formatDateRange(b.check_in, b.check_out)}</span>
                      <span>
                        {b.tourist_count}+{b.staff_count}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!ab && !next && upcoming.length === 0 && !loadingBookings && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noGerBookings")}
              </p>
            )}

            {loadingBookings && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={bookingDialogOpen}
        onOpenChange={(o) => !o && setBookingDialogOpen(false)}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("bookThisGer")} — {ger.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {t("name")}:{" "}
              <span className="font-medium text-foreground">{ger.name}</span> ·{" "}
              {ger.type} · cap {ger.capacity}
            </div>
            <div className="grid gap-1.5">
              <Label>{tb("tripCode")}</Label>
              <Input
                value={bForm.trip_code}
                onChange={(e) =>
                  setBForm((p) => ({ ...p, trip_code: e.target.value }))
                }
                placeholder="CHAM-2601"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{tb("source")}</Label>
              <Select
                value={bForm.source}
                onValueChange={(v) =>
                  setBForm((p) => ({ ...p, source: v as typeof p.source }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">{tb("sourceOperator")}</SelectItem>
                  <SelectItem value="website">{tb("sourceWebsite")}</SelectItem>
                  <SelectItem value="phone">{tb("sourcePhone")}</SelectItem>
                  <SelectItem value="walkin">{tb("sourceWalkin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bForm.source === "operator" && (
              <div className="grid gap-1.5">
                <Label>{tb("sourceOperator")}</Label>
                <Select
                  value={bForm.operator_id ?? ""}
                  onValueChange={(v) =>
                    setBForm((p) => ({ ...p, operator_id: v || null }))
                  }
                >
                  <SelectTrigger className="w-full">
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
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{tb("checkIn")}</Label>
                <Input
                  type="date"
                  value={bForm.check_in}
                  onChange={(e) =>
                    setBForm((p) => ({ ...p, check_in: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{tb("checkOut")}</Label>
                <Input
                  type="date"
                  value={bForm.check_out}
                  onChange={(e) =>
                    setBForm((p) => ({ ...p, check_out: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{tb("touristCount")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={bForm.tourist_count}
                  onChange={(e) =>
                    setBForm((p) => ({
                      ...p,
                      tourist_count: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{tb("staffCount")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={bForm.staff_count}
                  onChange={(e) =>
                    setBForm((p) => ({
                      ...p,
                      staff_count: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>{tc("status")}</Label>
              <Select
                value={bForm.status}
                onValueChange={(v) =>
                  setBForm((p) => ({ ...p, status: v as typeof p.status }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">
                    {tb("statusConfirmed")}
                  </SelectItem>
                  <SelectItem value="tentative">
                    {tb("statusTentative")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground -mb-1 mt-1"
            >
              <ChevronDown
                className={`size-3.5 transition-transform ${showAdvanced ? "" : "-rotate-90"}`}
              />
              {tc("advanced")}
            </button>

            {showAdvanced && (
              <div className="space-y-4 rounded-md border bg-muted/20 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>{tb("guideName")}</Label>
                    <Input
                      value={bForm.guide_name}
                      onChange={(e) =>
                        setBForm((p) => ({ ...p, guide_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{tb("guidePhone")}</Label>
                    <Input
                      value={bForm.guide_phone}
                      onChange={(e) =>
                        setBForm((p) => ({ ...p, guide_phone: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>{tc("notes")}</Label>
                  <Textarea
                    value={bForm.notes}
                    onChange={(e) =>
                      setBForm((p) => ({ ...p, notes: e.target.value }))
                    }
                    rows={2}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{tb("paymentStatus")}</Label>
                  <Select
                    value={bForm.payment_status}
                    onValueChange={(v) =>
                      setBForm((p) => ({
                        ...p,
                        payment_status: v as typeof p.payment_status,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">{tb("paymentUnpaid")}</SelectItem>
                      <SelectItem value="partial">
                        {tb("paymentPartial")}
                      </SelectItem>
                      <SelectItem value="paid">{tb("paymentPaid")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>{tc("total")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={bForm.total_amount}
                      onChange={(e) =>
                        setBForm((p) => ({
                          ...p,
                          total_amount: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Paid</Label>
                    <Input
                      type="number"
                      min={0}
                      value={bForm.payment_amount}
                      onChange={(e) =>
                        setBForm((p) => ({
                          ...p,
                          payment_amount: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBookingDialogOpen(false)}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={submitBooking}
              disabled={saving || !bForm.check_in || !bForm.check_out}
            >
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function GersPage() {
  const t = useTranslations("ger");
  const tc = useTranslations("common");
  const toast = useToast();

  const [configured] = useState(() => isEnvConfigured());
  const [gers, setGers] = useState<EnrichedGer[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedBooking[]>([]);
  const [loading, setLoading] = useState(configured);
  const [saving, setSaving] = useState(false);

  const [selectedGer, setSelectedGer] = useState<EnrichedGer | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [autoOpenBooking, setAutoOpenBooking] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGer, setEditingGer] = useState<EnrichedGer | null>(null);
  const [form, setForm] = useState<GerInsert>({ ...EMPTY_FORM });

  // Track what kind of thing the user is currently dragging so we can
  // highlight valid drop targets only when relevant.
  const [draggingKind, setDraggingKind] = useState<"ger" | "booking" | null>(null);

  const dragHappened = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchGers = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [gersRes, unRes] = await Promise.all([
        fetch("/api/gers"),
        fetch("/api/bookings/unassigned"),
      ]);
      if (!gersRes.ok)
        throw new Error(
          (await gersRes.json().catch(() => ({}))).error || t("fetchFailed")
        );
      const data: EnrichedGer[] = await gersRes.json();
      setGers(data);
      if (selectedGer) {
        const updated = data.find((g) => g.id === selectedGer.id);
        if (updated) setSelectedGer(updated);
      }
      if (unRes.ok) {
        const u: UnassignedBooking[] = await unRes.json();
        setUnassigned(u);
      } else {
        setUnassigned([]);
      }
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : t("fetchFailed"),
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [configured, t, selectedGer, toast]);

  useEffect(() => {
    fetchGers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -----------------------------------------------------------------------
  // Drag handlers (handles both ger reposition and booking → ger assign)
  // -----------------------------------------------------------------------

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over, delta } = event;
      const data = active.data.current as
        | { kind: "ger"; gerId: string }
        | { kind: "booking"; bookingId: string }
        | undefined;
      setDraggingKind(null);

      if (!data) return;

      // ── Booking chip dropped onto a ger ─────────────────────────────
      if (data.kind === "booking") {
        const overData = over?.data.current as
          | { kind: "ger"; gerId: string }
          | undefined;
        if (!overData || overData.kind !== "ger") return;

        const targetGer = gers.find((g) => g.id === overData.gerId);
        const booking = unassigned.find((b) => b.id === data.bookingId);
        if (!targetGer || !booking) return;

        // Optimistic: remove from tray immediately
        setUnassigned((prev) => prev.filter((b) => b.id !== booking.id));
        try {
          const res = await fetch(`/api/bookings/${booking.id}/assign-ger`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ger_id: targetGer.id }),
          });
          if (res.ok) {
            toast.show({
              message: t("assignSuccess", { ger: targetGer.name }),
              variant: "success",
            });
            fetchGers();
          } else {
            const j = await res.json().catch(() => ({}));
            setUnassigned((prev) => [...prev, booking]);
            toast.show({
              message:
                res.status === 409
                  ? t("assignConflict")
                  : j.error || t("assignFailed"),
              variant: "error",
            });
          }
        } catch {
          setUnassigned((prev) => [...prev, booking]);
          toast.show({ message: t("assignFailed"), variant: "error" });
        }
        return;
      }

      // ── Ger reposition (existing behaviour) ─────────────────────────
      if (data.kind === "ger") {
        const ger = gers.find((g) => g.id === data.gerId);
        if (!ger) return;

        const newX = Math.max(0, Math.round(ger.pos_x + delta.x));
        const newY = Math.max(0, Math.round(ger.pos_y + delta.y));

        setGers((prev) =>
          prev.map((g) => (g.id === ger.id ? { ...g, pos_x: newX, pos_y: newY } : g))
        );

        try {
          const res = await fetch("/api/gers/positions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              positions: [{ id: ger.id, pos_x: newX, pos_y: newY }],
            }),
          });
          if (!res.ok)
            setGers((prev) =>
              prev.map((g) =>
                g.id === ger.id
                  ? { ...g, pos_x: ger.pos_x, pos_y: ger.pos_y }
                  : g
              )
            );
        } catch {
          setGers((prev) =>
            prev.map((g) =>
              g.id === ger.id ? { ...g, pos_x: ger.pos_x, pos_y: ger.pos_y } : g
            )
          );
        }
      }
    },
    [gers, unassigned, t, fetchGers, toast]
  );

  // -----------------------------------------------------------------------
  // Availability toggle
  // -----------------------------------------------------------------------

  const toggleAvailability = useCallback(async (ger: EnrichedGer) => {
    const newVal = !ger.is_available;
    setGers((prev) =>
      prev.map((g) => (g.id === ger.id ? { ...g, is_available: newVal } : g))
    );
    try {
      const res = await fetch(`/api/gers/${ger.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: newVal }),
      });
      if (!res.ok)
        setGers((prev) =>
          prev.map((g) =>
            g.id === ger.id ? { ...g, is_available: ger.is_available } : g
          )
        );
    } catch {
      setGers((prev) =>
        prev.map((g) =>
          g.id === ger.id ? { ...g, is_available: ger.is_available } : g
        )
      );
    }
  }, []);

  // -----------------------------------------------------------------------
  // Ger CRUD
  // -----------------------------------------------------------------------

  function openAddDialog() {
    setEditingGer(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEditDialog(ger: EnrichedGer) {
    setEditingGer(ger);
    setForm({
      name: ger.name,
      type: ger.type,
      capacity: ger.capacity,
      price_per_night: ger.price_per_night ?? undefined,
      is_available: ger.is_available,
      description_mn: ger.description_mn ?? undefined,
      description_en: ger.description_en ?? undefined,
      sort_order: ger.sort_order,
      image_url: ger.image_url ?? undefined,
      pos_x: ger.pos_x,
      pos_y: ger.pos_y,
      width: ger.width,
      height: ger.height,
      area_sqm: ger.area_sqm ?? undefined,
      beds: ger.beds ?? [],
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price_per_night: form.price_per_night || undefined,
        description_mn: form.description_mn || undefined,
        description_en: form.description_en || undefined,
        image_url: form.image_url || undefined,
        area_sqm: form.area_sqm || undefined,
        beds: form.beds ?? [],
      };
      if (editingGer) {
        const res = await fetch(`/api/gers/${editingGer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => ({}))).error || t("saveFailed")
          );
        const updated: GerRow = await res.json();
        setGers((prev) =>
          prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g))
        );
      } else {
        const res = await fetch("/api/gers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => ({}))).error || t("saveFailed")
          );
        const created: EnrichedGer = await res.json();
        setGers((prev) => [...prev, created]);
      }
      setDialogOpen(false);
      toast.show({ message: tc("saved"), variant: "success" });
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : t("saveFailed"),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(ger: EnrichedGer) {
    const snapshot = gers;
    setGers((prev) => prev.filter((g) => g.id !== ger.id));
    if (selectedGer?.id === ger.id) {
      setSheetOpen(false);
      setSelectedGer(null);
    }
    toast.show({
      message: tc("deleted"),
      description: ger.name,
      undo: {
        onUndo: () => {
          setGers(snapshot);
          toast.show({ message: tc("undone"), variant: "info" });
        },
        onCommit: async () => {
          try {
            const res = await fetch(`/api/gers/${ger.id}`, {
              method: "DELETE",
            });
            if (!res.ok) throw new Error("delete failed");
          } catch {
            setGers(snapshot);
            toast.show({ message: t("deleteFailed"), variant: "error" });
          }
        },
      },
    });
  }

  function openSheet(ger: EnrichedGer) {
    setSelectedGer(ger);
    setSheetOpen(true);
  }

  function typeLabel(type: GerType): string {
    return ({
      "1-bed": t("type1bed"),
      "2-bed": t("type2bed"),
      deluxe: t("typeDeluxe"),
      staff: t("typeStaff"),
    })[type];
  }

  function stateBadgeEl(ger: EnrichedGer) {
    const s = getEffectiveState(ger);
    const label = {
      occupied: t("stateOccupied"),
      checking_out_today: t("stateCheckingOutToday"),
      arriving_soon: t("stateArrivingSoon"),
      cleaning: t("stateCleaning"),
      available: t("stateAvailable"),
    }[s];
    return (
      <Badge className={`${getStatusBg(s)} text-foreground`}>
        <span
          className={`mr-1.5 inline-block size-1.5 rounded-full ${getDotColor(s)}`}
        />
        {label}
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <Button onClick={openAddDialog} disabled={!configured}>
          <Plus className="size-4 mr-1" />
          {t("addGer")}
        </Button>
      </div>

      {!configured && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <div className="font-medium text-amber-900 dark:text-amber-200">
              {tc("notConfigured")}
            </div>
            <div className="mt-0.5 text-amber-900/80 dark:text-amber-200/80">
              {tc("notConfiguredDesc")}
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="gers">
        <TabsList>
          <TabsTrigger value="gers">{t("gerManagement")}</TabsTrigger>
          <TabsTrigger value="bookings">{t("allBookings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="gers" className="space-y-4 mt-4">
          <DndContext
            sensors={sensors}
            onDragStart={(e) => {
              dragHappened.current = true;
              const k = (e.active.data.current as { kind?: string } | undefined)
                ?.kind;
              if (k === "ger" || k === "booking") setDraggingKind(k);
            }}
            onDragEnd={(e) => {
              handleDragEnd(e);
              setTimeout(() => {
                dragHappened.current = false;
              }, 0);
            }}
            onDragCancel={() => setDraggingKind(null)}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              {/* Camp layout canvas */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("campLayout")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="relative overflow-hidden rounded-lg border bg-amber-50/50 dark:bg-amber-950/10"
                    style={{ width: "100%", maxWidth: 1000, height: 600 }}
                  >
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      width="100%"
                      height="100%"
                    >
                      <defs>
                        <pattern
                          id="grid"
                          width="50"
                          height="50"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M 50 0 L 0 0 0 50"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="0.5"
                            className="text-gray-200 dark:text-gray-700"
                          />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : gers.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        {t("noGersCanvas")}
                      </div>
                    ) : (
                      gers.map((ger) => (
                        <DraggableGer
                          key={ger.id}
                          ger={ger}
                          isDropTarget={draggingKind === "booking"}
                          onSelect={() => {
                            if (!dragHappened.current) openSheet(ger);
                          }}
                        />
                      ))
                    )}
                  </div>

                  {/* Legend */}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full border-2 border-amber-500 bg-emerald-100" />
                      {t("typeDeluxe")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full border-2 border-blue-500 bg-emerald-100" />
                      {t("type2bed")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full border-2 border-green-500 bg-emerald-100" />
                      {t("type1bed")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-md border-2 border-gray-400 bg-emerald-100" />
                      {t("typeStaff")}
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full bg-emerald-100 border" />
                      {t("stateAvailable")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full bg-sky-100 border" />
                      {t("stateArrivingSoon")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full bg-orange-100 border" />
                      {t("stateCheckingOutToday")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full bg-rose-100 border" />
                      {t("stateOccupied")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block size-3 rounded-full bg-amber-100 border" />
                      {t("stateCleaning")}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Unassigned bookings tray */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t("unassignedTitle")}
                    {unassigned.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {unassigned.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {t("unassignedSubtitle")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : unassigned.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("unassignedEmpty")}
                    </p>
                  ) : (
                    unassigned.map((b) => (
                      <DraggableBookingChip key={b.id} booking={b} />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </DndContext>

          {/* Ger table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("capacity")}</TableHead>
                    <TableHead>{t("areaSqm")}</TableHead>
                    <TableHead>{t("beds")}</TableHead>
                    <TableHead>{t("pricePerNight")}</TableHead>
                    <TableHead>{tc("status")}</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : gers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {t("noGersTable", { addGer: t("addGer") })}
                      </TableCell>
                    </TableRow>
                  ) : (
                    gers.map((ger) => (
                      <TableRow
                        key={ger.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openSheet(ger)}
                      >
                        <TableCell className="font-medium">{ger.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{typeLabel(ger.type)}</Badge>
                        </TableCell>
                        <TableCell>{ger.capacity}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {ger.area_sqm != null ? `${Number(ger.area_sqm)} m²` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {(ger.beds ?? []).length === 0
                            ? "—"
                            : (ger.beds ?? [])
                                .map((b) => `${b.count}× ${b.size}`)
                                .join(", ")}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {ger.price_per_night != null
                            ? `${Number(ger.price_per_night).toLocaleString()} ${tc("currency")}`
                            : "—"}
                        </TableCell>
                        <TableCell>{stateBadgeEl(ger)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={ger.is_available}
                            onCheckedChange={() => toggleAvailability(ger)}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => {
                                setSelectedGer(ger);
                                setAutoOpenBooking(true);
                                setSheetOpen(true);
                              }}
                              title={tc("quickBook")}
                            >
                              <CalendarPlus className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openEditDialog(ger)}
                              title={tc("edit")}
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDelete(ger)}
                              title={tc("delete")}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <BookingsList onBookingChange={fetchGers} />
        </TabsContent>
      </Tabs>

      <GerDetailSheet
        ger={selectedGer}
        open={sheetOpen}
        autoOpenBooking={autoOpenBooking}
        onClose={() => {
          setSheetOpen(false);
          setSelectedGer(null);
          setAutoOpenBooking(false);
        }}
        onEdit={(g) => {
          setSheetOpen(false);
          openEditDialog(g);
        }}
        onDelete={(g) => {
          setSheetOpen(false);
          handleDelete(g);
        }}
        onBookingCreated={fetchGers}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGer ? t("editGer", { name: editingGer.name }) : t("addGer")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ger-name">{t("name")}</Label>
              <Input
                id="ger-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("type")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, type: v as GerType }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-bed">{t("type1bed")}</SelectItem>
                  <SelectItem value="2-bed">{t("type2bed")}</SelectItem>
                  <SelectItem value="deluxe">{t("typeDeluxe")}</SelectItem>
                  <SelectItem value="staff">{t("typeStaff")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ger-capacity">{t("capacity")}</Label>
                <Input
                  id="ger-capacity"
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setForm((f) => ({
                      ...f,
                      capacity:
                        raw === "" ? 0 : Math.max(0, parseInt(raw, 10) || 0),
                    }));
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ger-area">{t("areaSqm")}</Label>
                <Input
                  id="ger-area"
                  type="number"
                  min={1}
                  step="0.5"
                  value={form.area_sqm ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      area_sqm: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder={t("areaSqmPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ger-price">{t("pricePerNight")}</Label>
                <Input
                  id="ger-price"
                  type="number"
                  min={0}
                  value={form.price_per_night ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price_per_night: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("beds")}</Label>
              <BedsEditor
                beds={form.beds ?? []}
                onChange={(beds) => setForm((f) => ({ ...f, beds }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ger-desc-mn">{t("descriptionMn")}</Label>
              <Textarea
                id="ger-desc-mn"
                value={form.description_mn ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description_mn: e.target.value }))
                }
                placeholder={t("descriptionMnPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ger-desc-en">{t("descriptionEn")}</Label>
              <Textarea
                id="ger-desc-en"
                value={form.description_en ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description_en: e.target.value }))
                }
                placeholder={t("descriptionEnPlaceholder")}
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {tc("cancel")}
              </DialogClose>
              <Button type="submit" disabled={saving || form.capacity < 1}>
                {saving && <Loader2 className="size-3 mr-1 animate-spin" />}
                {tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
