"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type EmailIntakeRow = {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  attachment_filename: string | null;
  attachment_mime: string | null;
  attachment_size_bytes: number | null;
  status: "pending" | "parsed" | "imported" | "ignored" | "error";
  operator_id: string | null;
  parse_error: string | null;
  imported_booking_count: number;
  operators?: { name: string } | null;
};

const STATUS_COLORS: Record<EmailIntakeRow["status"], string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  parsed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  imported:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  ignored: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function InboxPage() {
  const t = useTranslations("admin.inbox");
  const tc = useTranslations("common");

  const [rows, setRows] = useState<EmailIntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/email-intake?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  async function updateStatus(id: string, status: EmailIntakeRow["status"]) {
    await fetch(`/api/email-intake/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchRows();
  }

  async function deleteRow(id: string) {
    await fetch(`/api/email-intake/${id}`, { method: "DELETE" });
    fetchRows();
  }

  const statusLabels: Record<string, string> = useMemo(
    () => ({
      all: tc("filter"),
      pending: t("statusPending"),
      parsed: t("statusParsed"),
      imported: t("statusImported"),
      ignored: t("statusIgnored"),
      error: t("statusError"),
    }),
    [t, tc]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Status filter */}
      <Card size="sm">
        <CardContent>
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <TabsList>
              {["pending", "parsed", "imported", "ignored", "error", "all"].map(
                (s) => (
                  <TabsTrigger key={s} value={s}>
                    {statusLabels[s]}
                  </TabsTrigger>
                )
              )}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Inbox className="mb-2 size-10 opacity-40" />
              <p>{t("empty")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("from")}</TableHead>
                  <TableHead>{t("subject")}</TableHead>
                  <TableHead>{t("attachment")}</TableHead>
                  <TableHead>{tc("date")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            {row.from_name || row.from_address}
                          </div>
                          {row.from_name && (
                            <div className="text-xs text-muted-foreground">
                              {row.from_address}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm truncate">
                      {row.subject || (
                        <span className="text-muted-foreground">
                          (no subject)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.attachment_filename ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Paperclip className="size-3.5 text-muted-foreground" />
                          <span className="truncate max-w-[14rem]">
                            {row.attachment_filename}
                          </span>
                          {row.attachment_size_bytes != null && (
                            <span className="text-muted-foreground">
                              ({Math.round(row.attachment_size_bytes / 1024)}{" "}
                              KB)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(row.received_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_COLORS[row.status]}
                        variant="secondary"
                      >
                        {statusLabels[row.status]}
                      </Badge>
                      {row.status === "imported" &&
                        row.imported_booking_count > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({row.imported_booking_count})
                          </span>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {row.attachment_filename &&
                          row.status !== "imported" && (
                            <Link
                              href={`/admin/inbox/${row.id}`}
                              className={buttonVariants({
                                variant: "default",
                                size: "sm",
                              })}
                            >
                              <Sparkles className="mr-1.5 size-3.5" />
                              {t("parseAction")}
                            </Link>
                          )}
                        {row.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => updateStatus(row.id, "ignored")}
                            title={t("ignoreAction")}
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteRow(row.id)}
                          title={tc("delete")}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
