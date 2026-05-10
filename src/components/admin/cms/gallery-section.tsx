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
import { useToast } from "@/components/ui/toast";

type GalleryImage = {
  id: string;
  url: string;
  caption_mn: string | null;
  caption_en: string | null;
  category: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
};

type FormState = {
  url: string;
  caption_mn: string;
  caption_en: string;
  category: string;
  is_published: boolean;
  sort_order: string;
};

const EMPTY: FormState = {
  url: "",
  caption_mn: "",
  caption_en: "",
  category: "",
  is_published: true,
  sort_order: "0",
};

export function GallerySection() {
  const t = useTranslations("cms.gallery");
  const tCommon = useTranslations("cms.common");
  const tc = useTranslations("common");
  const toast = useToast();

  const [items, setItems] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gallery");
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

  function openEdit(item: GalleryImage) {
    setEditing(item);
    setForm({
      url: item.url,
      caption_mn: item.caption_mn ?? "",
      caption_en: item.caption_en ?? "",
      category: item.category ?? "",
      is_published: item.is_published,
      sort_order: String(item.sort_order),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.url.trim()) {
      setFormError(t("urlInvalid"));
      return;
    }
    try {
      new URL(form.url);
    } catch {
      setFormError(t("urlInvalid"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        url: form.url.trim(),
        caption_mn: form.caption_mn.trim() || undefined,
        caption_en: form.caption_en.trim() || undefined,
        category: form.category.trim() || undefined,
        is_published: form.is_published,
        sort_order: parseInt(form.sort_order, 10) || 0,
      };
      const url = editing ? `/api/gallery/${editing.id}` : "/api/gallery";
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
      const saved: GalleryImage = await res.json();
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

  function handleDelete(item: GalleryImage) {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    toast.show({
      message: t("deleted"),
      description: item.caption_en || item.caption_mn || item.url,
      undo: {
        label: tc("undo"),
        onUndo: () =>
          setItems((prev) =>
            [...prev, item].sort((a, b) => a.sort_order - b.sort_order)
          ),
        onCommit: async () => {
          const res = await fetch(`/api/gallery/${item.id}`, {
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
          {t("addImage")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{tCommon("preview")}</TableHead>
                <TableHead>{t("captionEn")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead className="w-20 text-right">
                  {tCommon("sortOrder")}
                </TableHead>
                <TableHead className="w-28">{tCommon("published")}</TableHead>
                <TableHead className="w-24 text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="relative h-10 w-14 overflow-hidden rounded bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {item.caption_en || item.caption_mn || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.category ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.sort_order}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                          item.is_published
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.is_published
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editImage") : t("addImage")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="grid gap-1.5">
              <Label>{t("url")} *</Label>
              <Input
                type="url"
                value={form.url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="https://"
              />
              <p className="text-xs text-muted-foreground">{t("urlHint")}</p>
            </div>

            {form.url && (
              <div className="overflow-hidden rounded-md border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.url}
                  alt=""
                  className="max-h-40 w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label>{t("captionEn")}</Label>
              <Input
                value={form.caption_en}
                onChange={(e) =>
                  setForm((p) => ({ ...p, caption_en: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("captionMn")}</Label>
              <Input
                value={form.caption_mn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, caption_mn: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("category")}</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  placeholder="gers"
                />
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

            <div className="flex items-center justify-between">
              <Label htmlFor="published">{tCommon("published")}</Label>
              <Switch
                id="published"
                checked={form.is_published}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, is_published: v }))
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
