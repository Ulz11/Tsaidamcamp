"use client";

import { useTranslations } from "next-intl";
import { BookingsList } from "@/components/admin/bookings-list";

export default function BookingsPage() {
  const t = useTranslations("booking");
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
      <BookingsList />
    </div>
  );
}
