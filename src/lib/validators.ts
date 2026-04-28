import { z } from "zod";

// ============================================================
// Operators
// ============================================================

export const operatorInsertSchema = z.object({
  name: z.string().min(1, "Operator name is required"),
  company: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

export const operatorUpdateSchema = operatorInsertSchema.partial();

export type OperatorInsert = z.infer<typeof operatorInsertSchema>;
export type OperatorUpdate = z.infer<typeof operatorUpdateSchema>;
export type OperatorRow = OperatorInsert & {
  id: string;
  created_at: string;
};

// ============================================================
// Gers
// ============================================================

export const gerTypeEnum = z.enum(["1-bed", "2-bed", "deluxe", "staff"]);

export const bedSchema = z.object({
  size: z.string().min(1),
  count: z.coerce.number().int().positive(),
});

export type Bed = z.infer<typeof bedSchema>;

export const gerInsertSchema = z.object({
  name: z.string().min(1, "Ger name is required"),
  type: gerTypeEnum,
  capacity: z.coerce.number().int().positive().default(2),
  price_per_night: z.coerce.number().nonnegative().optional(),
  is_available: z.boolean().default(true),
  description_mn: z.string().optional(),
  description_en: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  pos_x: z.coerce.number().default(0),
  pos_y: z.coerce.number().default(0),
  width: z.coerce.number().default(60),
  height: z.coerce.number().default(60),
  area_sqm: z.coerce.number().positive().optional(),
  beds: z.array(bedSchema).default([]),
});

export const gerUpdateSchema = gerInsertSchema.partial();

export type GerInsert = z.infer<typeof gerInsertSchema>;
export type GerUpdate = z.infer<typeof gerUpdateSchema>;
export type GerRow = GerInsert & {
  id: string;
  created_at: string;
};

// ============================================================
// Bookings
// ============================================================

export const bookingSourceEnum = z.enum(["operator", "website", "phone", "walkin"]);
export const bookingStatusEnum = z.enum(["confirmed", "tentative", "cancelled"]);
export const paymentStatusEnum = z.enum(["unpaid", "partial", "paid"]);

export const bookingInsertSchema = z
  .object({
    operator_id: z.string().uuid().nullable().optional(),
    trip_code: z.string().optional(),
    source: bookingSourceEnum,
    status: bookingStatusEnum.default("tentative"),
    check_in: z.coerce.date(),
    check_out: z.coerce.date(),
    tourist_count: z.coerce.number().int().nonnegative().optional(),
    staff_count: z.coerce.number().int().nonnegative().optional(),
    guide_name: z.string().optional(),
    guide_phone: z.string().optional(),
    notes: z.string().optional(),
    payment_status: paymentStatusEnum.optional(),
    payment_amount: z.coerce.number().nonnegative().optional(),
    total_amount: z.coerce.number().nonnegative().optional(),
  })
  .refine((data) => data.check_out > data.check_in, {
    message: "Check-out date must be after check-in date",
    path: ["check_out"],
  });

export const bookingUpdateSchema = z.object({
  operator_id: z.string().uuid().nullable().optional(),
  trip_code: z.string().optional(),
  source: bookingSourceEnum.optional(),
  status: bookingStatusEnum.optional(),
  check_in: z.coerce.date().optional(),
  check_out: z.coerce.date().optional(),
  tourist_count: z.coerce.number().int().nonnegative().optional(),
  staff_count: z.coerce.number().int().nonnegative().optional(),
  guide_name: z.string().optional(),
  guide_phone: z.string().optional(),
  notes: z.string().optional(),
  payment_status: paymentStatusEnum.optional(),
  payment_amount: z.coerce.number().nonnegative().optional(),
  total_amount: z.coerce.number().nonnegative().optional(),
});

export type BookingInsert = z.infer<typeof bookingInsertSchema>;
export type BookingUpdate = z.infer<typeof bookingUpdateSchema>;
export type BookingRow = {
  id: string;
  operator_id: string | null;
  trip_code?: string;
  source: z.infer<typeof bookingSourceEnum>;
  status: z.infer<typeof bookingStatusEnum>;
  check_in: string;
  check_out: string;
  tourist_count?: number;
  staff_count?: number;
  guide_name?: string;
  guide_phone?: string;
  notes?: string;
  payment_status?: z.infer<typeof paymentStatusEnum>;
  payment_amount?: number;
  total_amount?: number;
  created_at: string;
  updated_at: string;
};

// ============================================================
// Booking Gers (junction table)
// ============================================================

export const guestTypeEnum = z.enum(["tourist", "staff"]);

export const bookingGerInsertSchema = z.object({
  booking_id: z.string().uuid(),
  ger_id: z.string().uuid(),
  guest_type: guestTypeEnum.optional(),
});

export const bookingGerUpdateSchema = bookingGerInsertSchema.partial();

export type BookingGerInsert = z.infer<typeof bookingGerInsertSchema>;
export type BookingGerUpdate = z.infer<typeof bookingGerUpdateSchema>;
export type BookingGerRow = BookingGerInsert & {
  id: string;
};

// ============================================================
// Meals
// ============================================================

export const mealInsertSchema = z.object({
  booking_id: z.string().uuid(),
  date: z.coerce.date(),
  breakfast_tourist: z.coerce.number().int().nonnegative().default(0),
  breakfast_staff: z.coerce.number().int().nonnegative().default(0),
  lunch_tourist: z.coerce.number().int().nonnegative().default(0),
  lunch_staff: z.coerce.number().int().nonnegative().default(0),
  dinner_tourist: z.coerce.number().int().nonnegative().default(0),
  dinner_staff: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

export const mealUpdateSchema = mealInsertSchema.partial();

export type MealInsert = z.infer<typeof mealInsertSchema>;
export type MealUpdate = z.infer<typeof mealUpdateSchema>;
export type MealRow = MealInsert & {
  id: string;
};

// ============================================================
// Guests
// ============================================================

export const guestInsertSchema = z.object({
  booking_id: z.string().uuid().optional(),
  name: z.string().min(1, "Guest name is required"),
  nationality: z.string().optional(),
  passport_no: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export const guestUpdateSchema = guestInsertSchema.partial();

export type GuestInsert = z.infer<typeof guestInsertSchema>;
export type GuestUpdate = z.infer<typeof guestUpdateSchema>;
export type GuestRow = GuestInsert & {
  id: string;
};

// ============================================================
// Transactions
// ============================================================

export const transactionTypeEnum = z.enum(["income", "expense"]);
export const transactionCategoryEnum = z.enum([
  "booking",
  "meal",
  "salary",
  "service",
  "supply",
  "maintenance",
  "other",
]);
export const transactionSourceEnum = z.enum(["manual", "csv", "gmail"]);

export const transactionInsertSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number(),
  type: transactionTypeEnum,
  category: transactionCategoryEnum.optional(),
  description: z.string().optional(),
  counterparty: z.string().optional(),
  source: transactionSourceEnum.optional(),
});

export const transactionUpdateSchema = transactionInsertSchema.partial();

export type TransactionInsert = z.infer<typeof transactionInsertSchema>;
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;
export type TransactionRow = TransactionInsert & {
  id: string;
};

// ============================================================
// Ger Position Batch Update
// ============================================================

export const gerPositionUpdateSchema = z.object({
  id: z.string().uuid(),
  pos_x: z.number(),
  pos_y: z.number(),
});

export const gerPositionBatchUpdateSchema = z.array(gerPositionUpdateSchema);

export type GerPositionUpdate = z.infer<typeof gerPositionUpdateSchema>;
export type GerPositionBatchUpdate = z.infer<typeof gerPositionBatchUpdateSchema>;

// ============================================================
// Gallery images (CMS)
// ============================================================

export const galleryImageInsertSchema = z.object({
  url: z.string().url(),
  caption_mn: z.string().optional(),
  caption_en: z.string().optional(),
  category: z.string().optional(),
  is_published: z.boolean().default(true),
  sort_order: z.coerce.number().int().optional(),
});

export const galleryImageUpdateSchema = galleryImageInsertSchema.partial();

export type GalleryImageInsert = z.infer<typeof galleryImageInsertSchema>;
export type GalleryImageUpdate = z.infer<typeof galleryImageUpdateSchema>;
export type GalleryImageRow = GalleryImageInsert & {
  id: string;
  created_at: string;
};

// ============================================================
// Promotions (CMS)
// ============================================================

export const promotionInsertSchema = z.object({
  title_mn: z.string().min(1, "Title is required"),
  title_en: z.string().optional(),
  description_mn: z.string().optional(),
  description_en: z.string().optional(),
  discount_label: z.string().optional(),
  starts_on: z.coerce.date().optional(),
  ends_on: z.coerce.date().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  sort_order: z.coerce.number().int().optional(),
});

export const promotionUpdateSchema = promotionInsertSchema.partial();

export type PromotionInsert = z.infer<typeof promotionInsertSchema>;
export type PromotionUpdate = z.infer<typeof promotionUpdateSchema>;
export type PromotionRow = PromotionInsert & {
  id: string;
  created_at: string;
};

// ============================================================
// News posts (CMS)
// ============================================================

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const newsPostInsertSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens"),
  title_mn: z.string().min(1, "Title is required"),
  title_en: z.string().optional(),
  excerpt_mn: z.string().optional(),
  excerpt_en: z.string().optional(),
  body_mn: z.string().optional(),
  body_en: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal("")),
  is_published: z.boolean().default(false),
  published_at: z.coerce.date().optional().nullable(),
});

export const newsPostUpdateSchema = newsPostInsertSchema.partial();

export type NewsPostInsert = z.infer<typeof newsPostInsertSchema>;
export type NewsPostUpdate = z.infer<typeof newsPostUpdateSchema>;
export type NewsPostRow = NewsPostInsert & {
  id: string;
  created_at: string;
  updated_at: string;
};

// ============================================================
// Public booking submission (from website)
// ============================================================
// Locked-down shape for anonymous submissions: source is forced
// to "website", status forced to "tentative", no payment fields,
// no operator linkage. Contact info goes into `notes` so the admin
// has the lead in one place without us touching guests table on
// anon insert (RLS only allows bookings insert for anon).

export const publicBookingSchema = z
  .object({
    check_in: z.coerce.date(),
    check_out: z.coerce.date(),
    tourist_count: z.coerce.number().int().positive(),
    contact_name: z.string().min(1, "Name is required"),
    contact_phone: z.string().min(1, "Phone is required"),
    contact_email: z.string().email().optional().or(z.literal("")),
    message: z.string().optional(),
  })
  .refine((d) => d.check_out > d.check_in, {
    message: "Check-out must be after check-in",
    path: ["check_out"],
  });

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
