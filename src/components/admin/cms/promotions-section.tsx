"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type Promotion = {
  id: string;
  title_mn: string;
  title_en: string | null;
  description_mn: string | null;
  description_en: string | null;
  discount_label: string | null;
  starts_on: string | null;
  ends_on: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type FormState = {
  title_mn: string;
  title_en: string;
  description_mn: string;
  description_en: string;
  discount_label: string;
  starts_on: string;
  ends_on: string;
  image_url: string;
  is_active: boolean;
  sort_order: string;
};

const EMPTY: FormState = {
  title_mn: "",
  title_en: "",
  description_mn: "",
  description_en: "",
  discount_label: "",
  starts_on: "",
  ends_on: "",
  image_url: "",
  is_active: true,
  sort_order: "0",
};

export function PromotionsSection() {
  const t = useTranslations("cms.promotions");
  const tCommon = useTranslations("cms.common");
  const tc = useTranslations("common");
  const toast = useToast();

  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/promotions");
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: Promotion) {
    setEditing(item);
    setForm({
      title_mn: item.title_mn,
      title_en: item.title_en ?? "",
      description_mn: item.description_mn ?? "",
      description_en: item.description_en ?? "",
      discount_label: item.discount_label ?? "",
      starts_on: item.starts_on ?? "",
      ends_on: item.ends_on ?? "",
      image_url: item.image_url ?? "",
      is_active: item.is_active,
      sort_order: String(item.sort_order),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title_mn.trim()) {
      setFormError(t("titleRequired"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        title_mn: form.title_mn.trim(),
        title_en: form.title_en.trim() || undefined,
        description_mn: form.description_mn.trim() || undefined,
        description_en: form.description_en.trim() || undefined,
        discount_label: form.discount_label.trim() || undefined,
        starts_on: form.starts_on || undefined,
        ends_on: form.ends_on || undefined,
        image_url: form.image_url.trim() || undefined,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order, 10) || 0,
      };
      const url = editing ? `/api/promotions/${editing.id}` : "/api/promotions";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setFormError(body.error ?? tc("actionFailed"));
        return;
      }
      const saved: Promotion = await res.json();
      setItems((prev) =>
        editing
          ? prev.map((x) => (x.id === saved.id ? saved : x))
          : [...prev, saved].sort((a, b) => a.sort_order - b.sort_order)
      );
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(item: Promotion) {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    toast.show({
      message: t("deleted"),
      description: item.title_en || item.title_mn,
      undo: {
        label: tc("undo"),
        onUndo: () =>
          setItems((prev) =>
            [...prev, item].sort((a, b) => a.sort_order - b.sort_order)
          ),
        onCommit: async () => {
          const res = await fetch(`/api/promotions/${item.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            setItems((prev) =>
              [...prev, item].sort((a, b) => a.sort_order - b.sort_order)
            );
            toast.show({ message: tc("actionFailed"), variant: "error" });
          }
        },
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("title")}</h3>
        <Button onClick={openAdd}>
          <Plus className="mr-1.5 size-4" />
          {t("addPromotion")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("titleMn")}</TableHead>
                <TableHead>{t("discountLabel")}</TableHead>
                <TableHead>{t("startsOn")}</TableHead>
                <TableHead>{t("endsOn")}</TableHead>
                <TableHead className="w-20 text-right">
                  {tCommon("sortOrder")}
                </TableHead>
                <TableHead className="w-24">{tCommon("active")}</TableHead>
                <TableHead className="w-24 text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[280px] truncate font-medium">
                      {item.title_mn}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.discount_label ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {item.starts_on ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {item.ends_on ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.sort_order}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                          item.is_active
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.is_active
                          ? tCommon("live")
                          : tCommon("draft")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
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

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editPromotion") : t("addPromotion")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{t("titleMn")} *</Label>
                <Input
                  value={form.title_mn}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title_mn: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("titleEn")}</Label>
                <Input
                  value={form.title_en}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title_en: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("descriptionMn")}</Label>
              <Textarea
                rows={2}
                value={form.description_mn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description_mn: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("descriptionEn")}</Label>
              <Textarea
                rows={2}
                value={form.description_en}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description_en: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{t("discountLabel")}</Label>
                <Input
                  value={form.discount_label}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, discount_label: e.target.value }))
                  }
                  placeholder="20% OFF"
                />
                <p className="text-xs text-muted-foreground">
                  {t("discountLabelHint")}
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label>{tCommon("sortOrder")}</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sort_order: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{t("startsOn")}</Label>
                <Input
                  type="date"
                  value={form.starts_on}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, starts_on: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("endsOn")}</Label>
                <Input
                  type="date"
                  value={form.ends_on}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ends_on: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("imageUrl")}</Label>
              <Input
                type="url"
                value={form.image_url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, image_url: e.target.value }))
                }
                placeholder="https://"
              />
            </div>

            {form.image_url && (
              <div className="overflow-hidden rounded-md border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.image_url}
                  alt=""
                  className="max-h-32 w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="active">{tCommon("active")}</Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, is_active: v }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
