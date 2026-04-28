import {
  Accommodations,
  type AccommodationItem,
} from "@/components/website/accommodations";
import { BookingBar } from "@/components/website/booking-bar";
import { Hero } from "@/components/website/hero";
import { MOCK_ACCOMMODATIONS } from "@/lib/website/design";
import { createClient } from "@/lib/supabase/server";

/**
 * Public landing page.
 *
 * Composes the marketing sections. Data fetching is server-side here
 * (not via /api/public/gers fetch) because we're already in a Next.js
 * server component and a same-process Supabase query is faster and
 * doesn't burn an HTTP round-trip. If the front-end ever splits into a
 * separate origin (e.g. a Claude-Design build), swap this query for
 * `await fetch(API_BASE + "/api/public/gers")` — the section component
 * accepts the exact same shape either way.
 *
 * If the live query fails or returns nothing, we fall back to the mock
 * fixture so the page is always reviewable during early development.
 */
async function loadAccommodations(): Promise<AccommodationItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gers")
      .select(
        "id, name, type, capacity, price_per_night, description_mn, description_en, image_url, area_sqm"
      )
      .eq("is_available", true)
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) {
      return [...MOCK_ACCOMMODATIONS];
    }
    return data as AccommodationItem[];
  } catch {
    return [...MOCK_ACCOMMODATIONS];
  }
}

export default async function HomePage() {
  const items = await loadAccommodations();

  return (
    <>
      <section className="relative">
        <Hero />
        <BookingBar />
      </section>

      <Accommodations items={items} />
    </>
  );
}
