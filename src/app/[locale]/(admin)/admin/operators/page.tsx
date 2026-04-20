"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OperatorRow = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  notes: string | null;
  booking_count: number;
  created_at: string;
};

type OperatorForm = {
  name: string;
  company: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  notes: string;
};

const EMPTY_FORM: OperatorForm = {
  name: "",
  company: "",
  phone: "",
  fax: "",
  email: "",
  website: "",
  address: "",
  contact_person: "",
  contact_phone: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OperatorsPage() {
  const t = useTranslations("operator");
  const tc = useTranslations("common");

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OperatorRow | null>(null);
  const [form, setForm] = useState<OperatorForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<OperatorRow | null>(null);

  // Fetch ---------------------------------------------------------------
  const fetchOperators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operators?withCounts=1");
      if (res.ok) {
        const data = await res.json();
        setOperators(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  // Filter --------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.company?.toLowerCase().includes(q) ||
        o.contact_person?.toLowerCase().includes(q) ||
        o.email?.toLowerCase().includes(q)
    );
  }, [operators, searchQuery]);

  // Dialog handlers ------------------------------------------------------
  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(op: OperatorRow) {
    setEditing(op);
    setForm({
      name: op.name ?? "",
      company: op.company ?? "",
      phone: op.phone ?? "",
      fax: op.fax ?? "",
      email: op.email ?? "",
      website: op.website ?? "",
      address: op.address ?? "",
      contact_person: op.contact_person ?? "",
      contact_phone: op.contact_phone ?? "",
      notes: op.notes ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function updateField<K extends keyof OperatorForm>(
    key: K,
    value: OperatorForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFormError(t("nameRequired"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      // Send empty strings as undefined so the schema's optional checks pass
      const payload: Record<string, string | undefined> = {};
      (Object.keys(form) as (keyof OperatorForm)[]).forEach((k) => {
        const v = form[k].trim();
        payload[k] = v === "" ? undefined : v;
      });

      const url = editing ? `/api/operators/${editing.id}` : "/api/operators";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || tc("save"));
        return;
      }

      setDialogOpen(false);
      fetchOperators();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/operators/${deleting.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteDialogOpen(false);
        setDeleting(null);
        fetchOperators();
      }
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <Button onClick={openAdd}>
          <Plus className="mr-1.5 size-4" />
          {t("addOperator")}
        </Button>
      </div>

      {/* Search */}
      <Card size="sm">
        <CardContent>
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={`${tc("search")}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="mb-2 size-10 opacity-40" />
              <p>{searchQuery ? t("noResults") : t("empty")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("contactPerson")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead className="text-right">
                    {t("totalBookings")}
                  </TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{op.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {op.company ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {op.contact_person ?? "\u2014"}
                      {op.contact_phone && (
                        <span className="block text-xs text-muted-foreground">
                          {op.contact_phone}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {op.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" />
                          {op.phone}
                        </span>
                      ) : (
                        "\u2014"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {op.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3" />
                          {op.email}
                        </span>
                      ) : (
                        "\u2014"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{op.booking_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(op)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                          >
                            <MoreHorizontal className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(op)}>
                              <Pencil className="mr-1.5 size-3.5" />
                              {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setDeleting(op);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-1.5 size-3.5" />
                              {tc("delete")}
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

      {/* Add/Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setDialogOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editOperator") : t("addOperator")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">{t("name")} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Active Adventure Tours"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="company">{t("company")}</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
                placeholder="Актив Адвенчер Турс Монгол ХХК"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="contact_person">{t("contactPerson")}</Label>
                <Input
                  id="contact_person"
                  value={form.contact_person}
                  onChange={(e) =>
                    updateField("contact_person", e.target.value)
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contact_phone">{t("contactPhone")}</Label>
                <Input
                  id="contact_phone"
                  value={form.contact_phone}
                  onChange={(e) =>
                    updateField("contact_phone", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fax">{t("fax")}</Label>
                <Input
                  id="fax"
                  value={form.fax}
                  onChange={(e) => updateField("fax", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="website">{t("website")}</Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="address">{t("address")}</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">{tc("notes")}</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
              />
            </div>

            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setDeleting(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{tc("delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("deleteConfirm", { name: deleting?.name ?? "" })}
            {deleting && deleting.booking_count > 0 && (
              <span className="mt-2 block text-yellow-700 dark:text-yellow-400">
                {t("deleteWarning", { count: deleting.booking_count })}
              </span>
            )}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleting(null);
              }}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
