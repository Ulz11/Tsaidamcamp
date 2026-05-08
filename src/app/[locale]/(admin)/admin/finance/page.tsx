"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import {
  Plus,
  Upload,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type TxType = "income" | "expense";
type TxCategory =
  | "booking"
  | "meal"
  | "salary"
  | "service"
  | "supply"
  | "maintenance"
  | "other";

type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: TxType;
  category: TxCategory | null;
  description: string | null;
  counterparty: string | null;
  source: string;
  created_at: string;
};

const CATEGORIES: TxCategory[] = [
  "booking",
  "meal",
  "salary",
  "service",
  "supply",
  "maintenance",
  "other",
];

const PIE_COLORS = [
  "#6366f1",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const EMPTY_FORM = {
  date: format(new Date(), "yyyy-MM-dd"),
  amount: "",
  type: "income" as TxType,
  category: "" as TxCategory | "",
  description: "",
  counterparty: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat("mn-MN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const toast = useToast();

  // ── Data state ───────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState<string>("");
  const [filterCat, setFilterCat] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));

  // ── Add/Edit dialog ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── CSV dialog ───────────────────────────────────────────────────────────────
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMapDate, setCsvMapDate] = useState("");
  const [csvMapAmount, setCsvMapAmount] = useState("");
  const [csvMapDesc, setCsvMapDesc] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvMsg, setCsvMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = `${filterMonth}-01`;
      const to = format(endOfMonth(parseISO(`${filterMonth}-01`)), "yyyy-MM-dd");
      const params = new URLSearchParams({ from, to });
      if (filterType) params.set("type", filterType);
      if (filterCat) params.set("category", filterCat);
      const res = await fetch(`/api/transactions?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setTransactions(await res.json());
    } catch {
      setError(t("fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterType, filterCat, t]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Fetch ALL transactions for charts (unfiltered — always 12 months)
  const [allTx, setAllTx] = useState<Transaction[]>([]);
  useEffect(() => {
    const from = format(subMonths(startOfMonth(new Date()), 11), "yyyy-MM-dd");
    fetch(`/api/transactions?from=${from}`)
      .then((r) => r.json())
      .then(setAllTx)
      .catch(() => {});
  }, [transactions]); // re-fetch when transactions change (after save/delete)

  // ── Derived ──────────────────────────────────────────────────────────────────

  const { income, expense, balance } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === "income") income += Number(tx.amount);
      else expense += Number(tx.amount);
    }
    return { income, expense, balance: income - expense };
  }, [transactions]);

  // Monthly trend data (last 12 months) — keyed for breakdown list + chart
  const trendData = useMemo(() => {
    const months: {
      key: string;
      month: string;
      fullMonth: string;
      income: number;
      expense: number;
      net: number;
    }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM");
      const fullMonth = format(d, "MMM yyyy");
      let inc = 0;
      let exp = 0;
      for (const tx of allTx) {
        if (!tx.date.startsWith(key)) continue;
        if (tx.type === "income") inc += Number(tx.amount);
        else exp += Number(tx.amount);
      }
      months.push({
        key,
        month: label,
        fullMonth,
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }
    return months;
  }, [allTx]);

  // Month-over-month percent deltas (current month vs prior month)
  const momDelta = useMemo(() => {
    const curKey = filterMonth;
    const prev = subMonths(parseISO(`${filterMonth}-01`), 1);
    const prevKey = format(prev, "yyyy-MM");
    let curInc = 0,
      curExp = 0,
      prvInc = 0,
      prvExp = 0;
    for (const tx of allTx) {
      const val = Number(tx.amount);
      if (tx.date.startsWith(curKey)) {
        if (tx.type === "income") curInc += val;
        else curExp += val;
      } else if (tx.date.startsWith(prevKey)) {
        if (tx.type === "income") prvInc += val;
        else prvExp += val;
      }
    }
    const pct = (cur: number, prv: number) => {
      if (prv === 0) return cur === 0 ? 0 : null; // no prior baseline
      return ((cur - prv) / Math.abs(prv)) * 100;
    };
    return {
      income: pct(curInc, prvInc),
      expense: pct(curExp, prvExp),
      balance: pct(curInc - curExp, prvInc - prvExp),
    };
  }, [allTx, filterMonth]);

  // Expense pie data
  const expensePie = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of allTx) {
      if (tx.type !== "expense") continue;
      const cat = tx.category ?? "other";
      map.set(cat, (map.get(cat) ?? 0) + Number(tx.amount));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allTx]);

  // Income pie data
  const incomePie = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of allTx) {
      if (tx.type !== "income") continue;
      const cat = tx.category ?? "other";
      map.set(cat, (map.get(cat) ?? 0) + Number(tx.amount));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allTx]);

  // ── Dialog helpers ────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm({
      date: tx.date,
      amount: String(tx.amount),
      type: tx.type,
      category: tx.category ?? "",
      description: tx.description ?? "",
      counterparty: tx.counterparty ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    if (!form.date || isNaN(amount) || amount <= 0) {
      setFormError("Date and a positive amount are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        date: form.date,
        amount,
        type: form.type,
        category: form.category || undefined,
        description: form.description.trim() || undefined,
        counterparty: form.counterparty.trim() || undefined,
        source: "manual",
      };
      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? t("saveFailed"));
      const saved: Transaction = await res.json();
      setTransactions((prev) =>
        editing
          ? prev.map((tx) => (tx.id === saved.id ? saved : tx))
          : [saved, ...prev]
      );
      setDialogOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // Delete — optimistic + undo toast
  const handleDelete = (tx: Transaction) => {
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((x) => x.id !== tx.id));
    const sign = tx.type === "income" ? "+" : "−";
    const desc = tx.description?.trim() || "";
    toast.show({
      message: tc("deleted"),
      description: `${sign}${fmt(Number(tx.amount))} ${tc("currency")}${desc ? ` · ${desc}` : ""}`,
      undo: {
        onUndo: () => {
          setTransactions(snapshot);
          toast.show({ message: tc("undone"), variant: "info" });
        },
        onCommit: async () => {
          try {
            const res = await fetch(`/api/transactions/${tx.id}`, {
              method: "DELETE",
            });
            if (!res.ok) throw new Error();
          } catch {
            setTransactions(snapshot);
            toast.show({ message: tc("actionFailed"), variant: "error" });
          }
        },
      },
    });
  };

  // ── CSV helpers ───────────────────────────────────────────────────────────────

  const handleCsvFile = (file: File) => {
    setCsvMsg(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data.length) {
          setCsvMsg(t("csvParseError"));
          return;
        }
        const headers = result.meta.fields ?? [];
        setCsvHeaders(headers);
        setCsvRows(result.data);
        // Auto-detect common column names
        const dateCols = headers.filter((h) =>
          /date|огноо|дата/i.test(h)
        );
        const amtCols = headers.filter((h) =>
          /amount|дүн|sum|total|мөнгө/i.test(h)
        );
        const descCols = headers.filter((h) =>
          /desc|тайлбар|note|нэр|утга/i.test(h)
        );
        setCsvMapDate(dateCols[0] ?? headers[0] ?? "");
        setCsvMapAmount(amtCols[0] ?? headers[1] ?? "");
        setCsvMapDesc(descCols[0] ?? headers[2] ?? "");
        setCsvOpen(true);
      },
      error: () => setCsvMsg(t("csvParseError")),
    });
  };

  const handleCsvImport = async () => {
    if (!csvMapDate || !csvMapAmount) return;
    setCsvImporting(true);
    setCsvMsg(null);
    try {
      const rows = csvRows
        .map((row) => {
          const rawAmt = parseFloat(
            String(row[csvMapAmount] ?? "").replace(/[^\d.-]/g, "")
          );
          if (isNaN(rawAmt)) return null;
          return {
            date: row[csvMapDate] ?? "",
            amount: Math.abs(rawAmt),
            type: rawAmt >= 0 ? "income" : "expense",
            description: csvMapDesc ? (row[csvMapDesc] ?? "") || undefined : undefined,
            source: "csv",
          };
        })
        .filter(Boolean);

      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: rows }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      setCsvMsg(t("csvSuccess", { count: result.inserted }));
      fetchTransactions();
    } catch {
      setCsvMsg(t("csvError"));
    } finally {
      setCsvImporting(false);
    }
  };

  // ── Category label ────────────────────────────────────────────────────────────

  const catLabel = (cat: string | null) => {
    if (!cat) return "—";
    const key = `category${cat.charAt(0).toUpperCase()}${cat.slice(1)}` as
      | "categoryBooking"
      | "categoryMeal"
      | "categorySalary"
      | "categoryService"
      | "categorySupply"
      | "categoryMaintenance"
      | "categoryOther";
    return t(key);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            {t("uploadCsv")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCsvFile(f);
              e.target.value = "";
            }}
          />
          <Button onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addTransaction")}
          </Button>
        </div>
      </div>

      {/* Month filter + type + category */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="w-44"
        />
        <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allTypes")}</SelectItem>
            <SelectItem value="income">{t("income")}</SelectItem>
            <SelectItem value="expense">{t("expense")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v ?? "")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allCategories")}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {catLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          accent="emerald"
          label={t("income")}
          value={loading ? "—" : `${fmt(income)} ₮`}
          deltaPct={loading ? null : momDelta.income}
          deltaHint={t("vsLastMonth")}
          higherIsBetter
        />
        <KpiCard
          icon={<TrendingDown className="h-5 w-5" />}
          accent="rose"
          label={t("expense")}
          value={loading ? "—" : `${fmt(expense)} ₮`}
          deltaPct={loading ? null : momDelta.expense}
          deltaHint={t("vsLastMonth")}
          higherIsBetter={false}
        />
        <KpiCard
          icon={<Wallet className="h-5 w-5" />}
          accent={balance >= 0 ? "sky" : "rose"}
          label={t("balance")}
          value={
            loading
              ? "—"
              : `${balance >= 0 ? "" : "-"}${fmt(balance)} ₮`
          }
          deltaPct={loading ? null : momDelta.balance}
          deltaHint={t("vsLastMonth")}
          higherIsBetter
        />
      </div>

      {/* Charts: area trend + monthly breakdown list */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Monthly trend area chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("monthlyTrend")}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {t("last12Months")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.every((d) => d.income === 0 && d.expense === 0) ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t("noChartData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={trendData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [`${fmt(Number(value))} ₮`, ""]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name={t("income")}
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gradIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name={t("expense")}
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#gradExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly breakdown list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("monthlyBreakdown")}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {t("last12Months")}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {trendData.every((d) => d.income === 0 && d.expense === 0) ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t("noChartData")}
              </div>
            ) : (
              <div className="max-h-[240px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        {tc("date")}
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        {t("income")}
                      </th>
                      <th className="px-2 py-2 text-right font-medium">
                        {t("expense")}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t("net")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...trendData].reverse().map((m) => (
                      <tr
                        key={m.key}
                        className={cn(
                          "border-b border-border/60 last:border-0",
                          m.key === filterMonth && "bg-primary/5"
                        )}
                      >
                        <td className="px-3 py-1.5 tabular-nums">
                          {m.fullMonth}
                          {m.key === filterMonth && (
                            <span className="ml-1 rounded bg-primary/15 px-1 text-[9px] font-medium text-primary">
                              {t("thisMonth")}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {m.income ? fmt(m.income) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-rose-600 dark:text-rose-400">
                          {m.expense ? fmt(m.expense) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-1.5 text-right font-medium tabular-nums",
                            m.net > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : m.net < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground"
                          )}
                        >
                          {m.net === 0
                            ? "—"
                            : `${m.net > 0 ? "+" : "-"}${fmt(m.net)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown pies */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Expense pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("expenseBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensePie.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t("noChartData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expensePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({
                      name,
                      percent,
                    }: {
                      name?: string;
                      percent?: number;
                    }) =>
                      `${catLabel(name ?? null)} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {expensePie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${fmt(Number(value))} ₮`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Income pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("incomeBreakdown")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomePie.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                {t("noChartData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={incomePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({
                      name,
                      percent,
                    }: {
                      name?: string;
                      percent?: number;
                    }) =>
                      `${catLabel(name ?? null)} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {incomePie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${fmt(Number(value))} ₮`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Transactions table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">{tc("date")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{t("counterparty")}</TableHead>
                <TableHead className="text-right w-32">{t("amount")}</TableHead>
                <TableHead className="w-16 text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <div className="font-medium">{t("noTransactions")}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {t("noTransactionsDesc")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm tabular-nums">
                      {tx.date}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {tx.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {catLabel(tx.category)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.counterparty ?? "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${
                        tx.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {fmt(tx.amount)} ₮
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(tx)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(tx)}
                          title={tc("delete")}
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

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editTransaction") : t("addTransaction")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{tc("date")} *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("amount")} *</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  placeholder="50000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("type")} *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, type: v as TxType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t("income")}</SelectItem>
                    <SelectItem value="expense">{t("expense")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("category")}</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, category: v as TxCategory | "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {catLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t("description")}</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="e.g. Tour payment from operator"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("counterparty")}</Label>
              <Input
                value={form.counterparty}
                onChange={(e) =>
                  setForm((p) => ({ ...p, counterparty: e.target.value }))
                }
                placeholder="e.g. Nomadic Trails LLC"
              />
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

      {/* ── CSV Import Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("csvTitle")}</DialogTitle>
          </DialogHeader>

          {csvRows.length > 0 && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {t("csvPreview", { count: csvRows.length })}
              </p>

              {/* Column mapping */}
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>{t("csvMapDate")}</Label>
                    <select
                      value={csvMapDate}
                      onChange={(e) => setCsvMapDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-1 focus:ring-ring"
                    >
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>{t("csvMapAmount")}</Label>
                    <select
                      value={csvMapAmount}
                      onChange={(e) => setCsvMapAmount(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-1 focus:ring-ring"
                    >
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>{t("csvMapDescription")}</Label>
                  <select
                    value={csvMapDesc}
                    onChange={(e) => setCsvMapDesc(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">— skip —</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview table */}
              <div className="max-h-36 overflow-auto rounded border text-xs">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {[csvMapDate, csvMapAmount, csvMapDesc]
                        .filter(Boolean)
                        .map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-medium">
                            {h}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {[csvMapDate, csvMapAmount, csvMapDesc]
                          .filter(Boolean)
                          .map((h) => (
                            <td key={h} className="px-2 py-1 max-w-[120px] truncate">
                              {row[h]}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                {t("csvTypeBySign")}
              </p>

              {csvMsg && (
                <p className="text-sm font-medium">{csvMsg}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose>
              <Button variant="outline" disabled={csvImporting}>
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button
              onClick={handleCsvImport}
              disabled={csvImporting || !csvMapDate || !csvMapAmount}
            >
              {csvImporting
                ? t("csvImporting")
                : t("csvImport", { count: csvRows.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── KPI card with colored accent badge + MoM delta ──────────────────────────

type AccentColor = "emerald" | "rose" | "sky";

const ACCENT_BG: Record<AccentColor, string> = {
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
};

function KpiCard({
  icon,
  accent,
  label,
  value,
  deltaPct,
  deltaHint,
  higherIsBetter,
}: {
  icon: React.ReactNode;
  accent: AccentColor;
  label: string;
  value: string;
  deltaPct: number | null;
  deltaHint: string;
  higherIsBetter: boolean;
}) {
  const hasDelta = deltaPct !== null && Number.isFinite(deltaPct);
  const isUp = hasDelta && (deltaPct as number) > 0;
  const isDown = hasDelta && (deltaPct as number) < 0;
  const isFlat = hasDelta && deltaPct === 0;
  const good = higherIsBetter ? isUp : isDown;
  const bad = higherIsBetter ? isDown : isUp;
  const deltaColor = good
    ? "text-emerald-600 dark:text-emerald-400"
    : bad
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
          {hasDelta ? (
            <div
              className={cn(
                "mt-1 flex items-center gap-1 text-xs",
                deltaColor
              )}
            >
              {isUp ? (
                <ArrowUp className="h-3 w-3" />
              ) : isDown ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span className="font-medium tabular-nums">
                {isFlat ? "0%" : `${Math.abs(deltaPct as number).toFixed(0)}%`}
              </span>
              <span className="text-muted-foreground">{deltaHint}</span>
            </div>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground">
              {deltaHint}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            ACCENT_BG[accent]
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
