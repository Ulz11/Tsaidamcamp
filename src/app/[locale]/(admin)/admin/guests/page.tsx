"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────

type BookingSummary = {
  id: string;
  trip_code: string | null;
  check_in: string;
  check_out: string;
  operators?: { name: string } | null;
};

type Guest = {
  id: string;
  name: string;
  nationality: string | null;
  passport_no: string | null;
  phone: string | null;
  email: string | null;
  booking_id: string | null;
  created_at: string;
  bookings?: BookingSummary | null;
};

const EMPTY_FORM = {
  name: "",
  nationality: "",
  passport_no: "",
  phone: "",
  email: "",
  booking_id: null as string | null,
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GuestsPage() {
  const t = useTranslations("guest");
  const tc = useTranslations("common");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGuests = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/guests${params}`);
      if (!res.ok) throw new Error(await res.text());
      setGuests(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load all bookings for the link dropdown (once)
  useEffect(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data: BookingSummary[]) => setBookings(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchGuests("");
  }, [fetchGuests]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGuests(value), 350);
  };

  // ── Dialog helpers ────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (g: Guest) => {
    setEditing(g);
    setForm({
      name: g.name,
      nationality: g.nationality ?? "",
      passport_no: g.passport_no ?? "",
      phone: g.phone ?? "",
      email: g.email ?? "",
      booking_id: g.booking_id,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError(t("nameRequired"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        nationality: form.nationality.trim() || undefined,
        passport_no: form.passport_no.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        booking_id: form.booking_id || undefined,
      };

      const url = editing ? `/api/guests/${editing.id}` : "/api/guests";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? t("saveFailed"));

      const saved: Guest = await res.json();
      setGuests((prev) =>
        editing
          ? prev.map((g) => (g.id === saved.id ? saved : g))
          : [saved, ...prev]
      );
      setDialogOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete helpers ────────────────────────────────────────────────────────

  const openDelete = (g: Guest) => {
    setDeleteTarget(g);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guests/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGuests((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteOpen(false);
    } catch {
      // keep dialog open, let user retry
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const bookingLabel = (g: Guest) => {
    const b = g.bookings;
    if (!b) return null;
    return b.trip_code ?? b.operators?.name ?? b.check_in ?? b.id.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <Button onClick={openAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addGuest")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("nationality")}</TableHead>
                <TableHead>{t("passportNo")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("booking")}</TableHead>
                <TableHead className="w-20 text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              ) : guests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {search ? t("noResults") : t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                guests.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>{g.nationality ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{g.passport_no ?? "—"}</TableCell>
                    <TableCell>{g.phone ?? "—"}</TableCell>
                    <TableCell>
                      {bookingLabel(g) ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                          {bookingLabel(g)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">{t("noBooking")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(g)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDelete(g)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? t("editGuest") : t("addGuest")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="grid gap-1.5">
              <Label>{t("name")} *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Б. Болд"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("nationality")}</Label>
                <Input
                  value={form.nationality}
                  onChange={(e) => setForm((p) => ({ ...p, nationality: e.target.value }))}
                  placeholder="Mongolian"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("passportNo")}</Label>
                <Input
                  value={form.passport_no}
                  onChange={(e) => setForm((p) => ({ ...p, passport_no: e.target.value }))}
                  placeholder="PN123456"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+976 9900 0000"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("email")}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="guest@example.com"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("selectBooking")}</Label>
              <select
                value={form.booking_id ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, booking_id: e.target.value || null }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— {t("noBooking")} —</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.trip_code ?? b.id.slice(0, 8)} {b.check_in} → {b.check_out}
                    {b.operators?.name ? ` (${b.operators.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline" disabled={saving}>
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deleteWarning")}</p>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline" disabled={deleting}>
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
