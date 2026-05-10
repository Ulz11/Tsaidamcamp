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

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type NewsPost = {
  id: string;
  slug: string;
  title_mn: string;
  title_en: string | null;
  excerpt_mn: string | null;
  excerpt_en: string | null;
  body_mn: string | null;
  body_en: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  slug: string;
  title_mn: string;
  title_en: string;
  excerpt_mn: string;
  excerpt_en: string;
  body_mn: string;
  body_en: string;
  cover_image_url: string;
  is_published: boolean;
};

const EMPTY: FormState = {
  slug: "",
  title_mn: "",
  title_en: "",
  excerpt_mn: "",
  excerpt_en: "",
  body_mn: "",
  body_en: "",
  cover_image_url: "",
  is_published: false,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function NewsSection() {
  const t = useTranslations("cms.news");
  const tCommon = useTranslations("cms.common");
  const tc = useTranslations("common");
  const toast = useToast();

  const [items, setItems] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/news");
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
    setSlugTouched(false);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: NewsPost) {
    setEditing(item);
    setForm({
      slug: item.slug,
      title_mn: item.title_mn,
      title_en: item.title_en ?? "",
      excerpt_mn: item.excerpt_mn ?? "",
      excerpt_en: item.excerpt_en ?? "",
      body_mn: item.body_mn ?? "",
      body_en: item.body_en ?? "",
      cover_image_url: item.cover_image_url ?? "",
      is_published: item.is_published,
    });
    setSlugTouched(true);
    setFormError(null);
    setDialogOpen(true);
  }

  // When user types title (EN preferred, fall back to MN) before they touch
  // the slug field, auto-fill it. Once they edit slug manually we leave it.
  function handleTitleChange(field: "title_mn" | "title_en", value: string) {
    setForm((p) => {
      const next = { ...p, [field]: value };
      if (!editing && !slugTouched) {
        const seed = field === "title_en" ? value : p.title_en || value;
        next.slug = slugify(seed);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.title_mn.trim()) {
      setFormError(t("titleRequired"));
      return;
    }
    if (!form.slug.trim()) {
      setFormError(t("slugRequired"));
      return;
    }
    if (!SLUG_REGEX.test(form.slug.trim())) {
      setFormError(t("slugInvalid"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        slug: form.slug.trim(),
        title_mn: form.title_mn.trim(),
        title_en: form.title_en.trim() || undefined,
        excerpt_mn: form.excerpt_mn.trim() || undefined,
        excerpt_en: form.excerpt_en.trim() || undefined,
        body_mn: form.body_mn.trim() || undefined,
        body_en: form.body_en.trim() || undefined,
        cover_image_url: form.cover_image_url.trim() || undefined,
        is_published: form.is_published,
      };
      const url = editing ? `/api/news/${editing.id}` : "/api/news";
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
      const saved: NewsPost = await res.json();
      setItems((prev) =>
        editing
          ? prev.map((x) => (x.id === saved.id ? saved : x))
          : [saved, ...prev]
      );
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(item: NewsPost) {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    toast.show({
      message: t("deleted"),
      description: item.title_en || item.title_mn,
      undo: {
        label: tc("undo"),
        onUndo: () =>
          setItems((prev) =>
            [...prev, item].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
          ),
        onCommit: async () => {
          const res = await fetch(`/api/news/${item.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            setItems((prev) =>
              [...prev, item].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
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
          {t("addPost")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("titleMn")}</TableHead>
                <TableHead>{t("slug")}</TableHead>
                <TableHead>{t("publishedAt")}</TableHead>
                <TableHead className="w-28">{tCommon("published")}</TableHead>
                <TableHead className="w-24 text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
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
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.slug}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {item.published_at ? (
                        item.published_at.slice(0, 10)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editPost") : t("addPost")}
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
                  onChange={(e) => handleTitleChange("title_mn", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("titleEn")}</Label>
                <Input
                  value={form.title_en}
                  onChange={(e) => handleTitleChange("title_en", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("slug")} *</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((p) => ({ ...p, slug: e.target.value }));
                }}
                placeholder="summer-2026-opening"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("excerptMn")}</Label>
              <Textarea
                rows={2}
                value={form.excerpt_mn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, excerpt_mn: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("excerptEn")}</Label>
              <Textarea
                rows={2}
                value={form.excerpt_en}
                onChange={(e) =>
                  setForm((p) => ({ ...p, excerpt_en: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("bodyMn")}</Label>
              <Textarea
                rows={5}
                value={form.body_mn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, body_mn: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("bodyEn")}</Label>
              <Textarea
                rows={5}
                value={form.body_en}
                onChange={(e) =>
                  setForm((p) => ({ ...p, body_en: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("coverImage")}</Label>
              <Input
                type="url"
                value={form.cover_image_url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, cover_image_url: e.target.value }))
                }
                placeholder="https://"
              />
            </div>

            {form.cover_image_url && (
              <div className="overflow-hidden rounded-md border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.cover_image_url}
                  alt=""
                  className="max-h-32 w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="news-published">{tCommon("published")}</Label>
              <Switch
                id="news-published"
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
