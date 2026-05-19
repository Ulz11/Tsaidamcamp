"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { format, addDays } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";

type Availability =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; total: number; available: number }
  | { state: "none" }
  | { state: "error" };

type SubmitState =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; ref: string; name: string; phone: string }
  | { state: "error"; message: string };

function todayPlus(days: number): string {
  return format(addDays(new Date(), days), "yyyy-MM-dd");
}

export function BookingForm() {
  const t = useTranslations("website.bookingPage");
  const tb = useTranslations("website.booking");
  const params = useSearchParams();

  const [checkIn, setCheckIn] = useState(params.get("checkin") || todayPlus(1));
  const [checkOut, setCheckOut] = useState(params.get("checkout") || todayPlus(8));
  const [guests, setGuests] = useState(Number(params.get("guests") || "2") || 2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [submit, setSubmit] = useState<SubmitState>({ state: "idle" });

  const datesValid = useMemo(
    () => Boolean(checkIn && checkOut && new Date(checkOut) > new Date(checkIn)),
    [checkIn, checkOut]
  );

  // Derived availability: the effect only stores the *fetched* result keyed by
  // dates. The displayed Availability is computed from that — never set
  // synchronously in the effect body.
  const requestKey = datesValid ? `${checkIn}|${checkOut}` : null;
  const [fetched, setFetched] = useState<
    { key: string; result: Extract<Availability, { state: "ok" | "none" | "error" }> } | null
  >(null);

  useEffect(() => {
    if (!requestKey) return;
    const ctl = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/public/availability?from=${checkIn}&to=${checkOut}`,
          { signal: ctl.signal, cache: "no-store" }
        );
        if (!res.ok) {
          setFetched({ key: requestKey, result: { state: "error" } });
          return;
        }
        const data = (await res.json()) as { total: number; available: number };
        setFetched({
          key: requestKey,
          result:
            data.available > 0
              ? { state: "ok", total: data.total, available: data.available }
              : { state: "none" },
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setFetched({ key: requestKey, result: { state: "error" } });
      }
    }, 350);
    return () => {
      ctl.abort();
      window.clearTimeout(id);
    };
  }, [requestKey, checkIn, checkOut]);

  const availability: Availability = !requestKey
    ? { state: "idle" }
    : fetched && fetched.key === requestKey
    ? fetched.result
    : { state: "loading" };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submit.state === "submitting") return;
    setSubmit({ state: "submitting" });

    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_in: checkIn,
          check_out: checkOut,
          tourist_count: guests,
          contact_name: name,
          contact_phone: phone,
          contact_email: email || undefined,
          message: message || undefined,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { id: string };
        setSubmit({
          state: "success",
          ref: data.id.slice(0, 8).toUpperCase(),
          name,
          phone,
        });
        return;
      }
      if (res.status === 409) {
        setSubmit({ state: "error", message: t("errorSoldOut") });
        return;
      }
      if (res.status === 400) {
        setSubmit({ state: "error", message: t("errorValidation") });
        return;
      }
      setSubmit({ state: "error", message: t("errorGeneric") });
    } catch {
      setSubmit({ state: "error", message: t("errorGeneric") });
    }
  }

  if (submit.state === "success") {
    return (
      <div className="rounded-sm border border-[var(--color-tsaidam-forest)]/20 bg-white px-8 py-12 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-4 size-12 text-[var(--color-tsaidam-forest)]" />
        <h3 className="font-serif-display text-2xl font-medium text-[var(--color-tsaidam-ink)]">
          {t("successTitle")}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--color-tsaidam-ink-mid)]">
          {t("successBody", { name: submit.name, phone: submit.phone, ref: submit.ref })}
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmit({ state: "idle" });
            setName("");
            setPhone("");
            setEmail("");
            setMessage("");
          }}
          className="mt-6 inline-block bg-[var(--color-tsaidam-forest)] px-7 py-3 text-xs font-medium uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--color-tsaidam-forest-md)]"
        >
          {t("newRequest")}
        </button>
      </div>
    );
  }

  const submitDisabled =
    submit.state === "submitting" ||
    !datesValid ||
    !name.trim() ||
    !phone.trim() ||
    availability.state === "none";

  const inputCls =
    "rounded-sm border border-[var(--color-tsaidam-sand-dk)] bg-white px-3 py-2.5 text-sm text-[var(--color-tsaidam-ink)] outline-none placeholder:text-[var(--color-tsaidam-ink-soft)]/70 focus:border-[var(--color-tsaidam-forest)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-sm border border-[var(--color-tsaidam-sand-dk)] bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10"
    >
      <fieldset className="space-y-5">
        <legend className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-tsaidam-ink-soft)]">
          {t("stayDetails")}
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="checkin" label={tb("checkin")}>
            <input
              id="checkin"
              type="date"
              value={checkIn}
              min={todayPlus(0)}
              onChange={(e) => setCheckIn(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field id="checkout" label={tb("checkout")}>
            <input
              id="checkout"
              type="date"
              value={checkOut}
              min={checkIn || todayPlus(1)}
              onChange={(e) => setCheckOut(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field id="guests" label={tb("guests")}>
            <select
              id="guests"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className={inputCls}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <AvailabilityHint state={availability} />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-tsaidam-ink-soft)]">
          {t("yourDetails")}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label={t("name")}>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className={inputCls}
              required
            />
          </Field>
          <Field id="phone" label={t("phone")}>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
              className={inputCls}
              required
            />
          </Field>
          <Field id="email" label={t("email")} colSpan>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={inputCls}
            />
          </Field>
          <Field id="message" label={t("message")} colSpan>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              rows={3}
              className={inputCls}
            />
          </Field>
        </div>
      </fieldset>

      {submit.state === "error" && (
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {submit.message}
        </div>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className="inline-flex items-center justify-center gap-2 bg-[var(--color-tsaidam-clay)] px-10 py-3.5 text-xs font-medium uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--color-tsaidam-clay-lt)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {submit.state === "submitting" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  colSpan = false,
  children,
}: {
  id: string;
  label: string;
  colSpan?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${colSpan ? "sm:col-span-2" : ""}`}>
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-tsaidam-ink-soft)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function AvailabilityHint({ state }: { state: Availability }) {
  const t = useTranslations("website.bookingPage");
  if (state.state === "idle" || state.state === "error") return null;
  if (state.state === "loading") {
    return (
      <p className="flex items-center gap-2 text-xs text-[var(--color-tsaidam-ink-soft)]">
        <Loader2 className="size-3 animate-spin" />
        {t("availabilityChecking")}
      </p>
    );
  }
  if (state.state === "none") {
    return <p className="text-xs text-red-700">{t("availabilityNone")}</p>;
  }
  return (
    <p className="text-xs text-[var(--color-tsaidam-forest-md)]">
      {t("availabilityAvailable", {
        available: state.available,
        total: state.total,
      })}
    </p>
  );
}
