"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, Undo2, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant = "default" | "success" | "error" | "info";

export type ToastInput = {
  message: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  /** When provided, shows an Undo button. The toast becomes the only commit
   *  point: the actual destructive action runs on `onCommit` if the user does
   *  NOT click undo before duration expires. */
  undo?: {
    label?: string;
    onUndo: () => void;
    onCommit: () => void | Promise<void>;
  };
};

type Toast = ToastInput & {
  id: string;
  expiresAt: number;
  committed: boolean;
};

type ToastContextValue = {
  show: (t: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider />");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEFAULT_DURATION = 4000;
const UNDO_DURATION = 6000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      // For undoable toasts, dismissing early commits the action.
      setToasts((prev) => {
        const t = prev.find((x) => x.id === id);
        if (t?.undo && !t.committed) {
          // Run commit synchronously when dismissed
          Promise.resolve(t.undo.onCommit()).catch(() => {});
        }
        return prev.filter((x) => x.id !== id);
      });
      const timer = timers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
    },
    []
  );

  const show = useCallback(
    (input: ToastInput) => {
      const id = Math.random().toString(36).slice(2);
      const duration =
        input.durationMs ?? (input.undo ? UNDO_DURATION : DEFAULT_DURATION);
      const t: Toast = {
        ...input,
        id,
        expiresAt: Date.now() + duration,
        committed: false,
      };
      setToasts((prev) => [...prev, t]);

      const timer = setTimeout(() => {
        // Time's up: commit if undoable, then remove.
        setToasts((prev) => {
          const x = prev.find((p) => p.id === id);
          if (x?.undo && !x.committed) {
            Promise.resolve(x.undo.onCommit()).catch(() => {});
          }
          return prev.filter((p) => p.id !== id);
        });
        timers.current.delete(id);
      }, duration);
      timers.current.set(id, timer);

      return id;
    },
    []
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) clearTimeout(t);
      map.clear();
    };
  }, []);

  function handleUndo(id: string) {
    setToasts((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t?.undo && !t.committed) {
        try {
          t.undo.onUndo();
        } catch {
          /* swallow */
        }
      }
      return prev.filter((x) => x.id !== id);
    });
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <Toaster toasts={toasts} onUndo={handleUndo} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Toaster (presentation)
// ---------------------------------------------------------------------------

function Toaster({
  toasts,
  onUndo,
  onDismiss,
}: {
  toasts: Toast[];
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col-reverse gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onUndo={onUndo} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onUndo,
  onDismiss,
}: {
  toast: Toast;
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon =
    toast.variant === "success"
      ? CheckCircle2
      : toast.variant === "error"
        ? AlertCircle
        : Info;
  const tone =
    toast.variant === "success"
      ? "border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
      : toast.variant === "error"
        ? "border-rose-500/40 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100"
        : "border-border bg-background text-foreground";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur ${tone}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight">{toast.message}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs opacity-80">{toast.description}</div>
        )}
      </div>
      {toast.undo && (
        <button
          type="button"
          onClick={() => onUndo(toast.id)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-foreground/10"
        >
          <Undo2 className="size-3.5" />
          {toast.undo.label ?? "Undo"}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="rounded-md p-1 hover:bg-foreground/10"
        aria-label="dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
