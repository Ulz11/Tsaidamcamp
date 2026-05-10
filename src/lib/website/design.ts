// ---------------------------------------------------------------------------
// Tsaidam — public website design data
// ---------------------------------------------------------------------------
// Single place to change the visual content (hero photography, mock
// accommodations) without touching any component.  Section components import
// from here so the design stays decoupled from the rendering logic.
// ---------------------------------------------------------------------------

/**
 * Hero slideshow images. Replace these URLs with Supabase Storage paths or
 * any other CDN once the photography is finalized — no component changes
 * required. Each entry is rendered as a full-bleed background that
 * cross-fades to the next every {@link HERO_INTERVAL_MS}.
 */
export const HERO_SLIDES: ReadonlyArray<{ src: string; alt: string }> = [
  {
    src: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=2400&q=80",
    alt: "Mongolian steppe at golden hour",
  },
  {
    src: "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&w=2400&q=80",
    alt: "Ger interior lit by warm lamps",
  },
  {
    src: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=2400&q=80",
    alt: "Bonfire under a starry sky",
  },
  {
    src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2400&q=80",
    alt: "Quiet lake at dawn in the mountains",
  },
];

export const HERO_INTERVAL_MS = 5000;

/**
 * Mock accommodations — used as the fallback whenever the live `gers` table
 * is empty or unreachable, so the landing page always has something to show
 * during early development. Once real gers + photos are in Supabase, this
 * fallback simply stops being used; deletion is optional.
 */
export type MockGer = {
  id: string;
  name: string;
  type: "1-bed" | "2-bed" | "deluxe" | "staff";
  capacity: number;
  price_per_night: number | null;
  description_mn: string | null;
  description_en: string | null;
  image_url: string | null;
  area_sqm: number | null;
};

export const MOCK_ACCOMMODATIONS: ReadonlyArray<MockGer> = [
  {
    id: "mock-deluxe",
    name: "Lakeside Deluxe Ger",
    type: "deluxe",
    capacity: 2,
    price_per_night: 320000,
    description_en:
      "A handcrafted Mongolian ger with a king bed, wood stove, and a private deck overlooking the salt lake.",
    description_mn:
      "Цайдам нуурын эрэг дээрх кинг орт, зуухтай, хувийн террастай тансаг гэр.",
    image_url:
      "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&w=1600&q=80",
    area_sqm: 32,
  },
  {
    id: "mock-twin",
    name: "Twin Steppe Ger",
    type: "2-bed",
    capacity: 2,
    price_per_night: 240000,
    description_en:
      "Two queen beds, hand-painted furniture, and a felt-wrapped silence you can almost hear.",
    description_mn:
      "Хоёр queen ор, гар будаатай тавилга, эсгий нуруутай чимээгүй амралт.",
    image_url:
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
    area_sqm: 26,
  },
  {
    id: "mock-cabin",
    name: "Cedar Cabin",
    type: "1-bed",
    capacity: 2,
    price_per_night: 280000,
    description_en:
      "A timber cabin tucked into the larch trees — full bath, reading nook, and a sky-facing window above the bed.",
    description_mn:
      "Хуш модон бунгало — угаалгын өрөө, ном унших булан, оронгийн дээгүүр тэнгэр харсан цонх.",
    image_url:
      "https://images.unsplash.com/photo-1595877244574-e90ce41ce089?auto=format&fit=crop&w=1600&q=80",
    area_sqm: 28,
  },
  {
    id: "mock-family",
    name: "Family Ger",
    type: "2-bed",
    capacity: 4,
    price_per_night: 360000,
    description_en:
      "Two interconnected gers for families — perfect for children running between fire and felt.",
    description_mn:
      "Хоёр гэр холбогдсон гэр бүлийн байр — гал, эсгийн дунд тоглох хүүхэдтэй гэр бүлд төгс.",
    image_url:
      "https://images.unsplash.com/photo-1517821362941-f7f753e13a39?auto=format&fit=crop&w=1600&q=80",
    area_sqm: 44,
  },
  {
    id: "mock-single",
    name: "Solo Wanderer Ger",
    type: "1-bed",
    capacity: 1,
    price_per_night: 180000,
    description_en:
      "A snug ger built for one — wood stove, tea kettle, and the long horizon all to yourself.",
    description_mn:
      "Ганцаараа аяллын төгс ор — зуух, цайны данх, хязгаарт алсын хараа.",
    image_url:
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1600&q=80",
    area_sqm: 18,
  },
];

/**
 * Bento grid layout map. Indexed by position in the accommodations list,
 * returns Tailwind classes that decide tile size on `lg+` screens.
 * Keeping this here means the asymmetric pattern can be reshuffled without
 * editing the card component itself.
 */
export const BENTO_TILE_CLASSES: ReadonlyArray<string> = [
  "lg:col-span-2 lg:row-span-2", // hero tile
  "lg:col-span-1 lg:row-span-1",
  "lg:col-span-1 lg:row-span-1",
  "lg:col-span-2 lg:row-span-1",
  "lg:col-span-2 lg:row-span-1",
  "lg:col-span-1 lg:row-span-1",
  "lg:col-span-1 lg:row-span-1",
];
