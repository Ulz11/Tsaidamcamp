// ─────────────────────────────────────────────────────────────────────────────
// Mock data seeder — Tsaidam Camp
//
// Creates a realistic snapshot of a mid-summer camp:
//   • 12 gers (mixed types, positioned on the canvas)
//   • 6 tour operators
//   • ~30 bookings spanning past / today / future, varied sources & payment
//   • Some guests linked to bookings
//   • Booking ↔ ger assignments via the booking_gers junction
//   • ~20 finance transactions (income + expenses across last 6 months)
//
// SAFE TO RE-RUN: it deletes existing rows in dependency order before inserting.
//
// Usage:   node scripts/seed-mock-data.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// ── Load env from .env.local ────────────────────────────────────────────────
const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const envText = readFileSync(envPath, "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ── Helpers ─────────────────────────────────────────────────────────────────
const today = new Date();
const isoDate = (d) => d.toISOString().slice(0, 10);
const daysFromNow = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
const monthsAgo = (m) => {
  const d = new Date(today);
  d.setMonth(d.getMonth() - m);
  return d;
};

// ── 1. CLEAN existing data (reverse dependency order) ──────────────────────
async function clean() {
  console.log("🧹  Cleaning existing data…");
  // Children first
  await sb.from("guests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("booking_gers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("operators").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("gers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

// ── 2. GERS ─────────────────────────────────────────────────────────────────
const GERS = [
  // Standard 2-bed gers — left side of camp
  { name: "Гэр 1", type: "2-bed", capacity: 2, price_per_night: 180000, area_sqm: 22, pos_x: 80, pos_y: 120, beds: [{ size: "single", count: 2 }], description_en: "Cozy 2-bed traditional ger", description_mn: "Уламжлалт 2 ортой гэр", sort_order: 1 },
  { name: "Гэр 2", type: "2-bed", capacity: 2, price_per_night: 180000, area_sqm: 22, pos_x: 200, pos_y: 120, beds: [{ size: "single", count: 2 }], description_en: "Cozy 2-bed traditional ger", description_mn: "Уламжлалт 2 ортой гэр", sort_order: 2 },
  { name: "Гэр 3", type: "2-bed", capacity: 2, price_per_night: 180000, area_sqm: 24, pos_x: 320, pos_y: 120, beds: [{ size: "single", count: 2 }], description_en: "2-bed ger near the lake", description_mn: "Нуурын ойролцоо 2 ортой гэр", sort_order: 3 },
  { name: "Гэр 4", type: "2-bed", capacity: 2, price_per_night: 180000, area_sqm: 22, pos_x: 440, pos_y: 120, beds: [{ size: "single", count: 2 }], description_en: "2-bed ger", description_mn: "2 ортой гэр", sort_order: 4 },

  // Family 1-bed (king) gers
  { name: "Гэр 5", type: "1-bed", capacity: 2, price_per_night: 220000, area_sqm: 28, pos_x: 80, pos_y: 240, beds: [{ size: "double", count: 1 }], description_en: "Cozy honeymoon ger", description_mn: "Хосуудад зориулсан гэр", sort_order: 5 },
  { name: "Гэр 6", type: "1-bed", capacity: 2, price_per_night: 220000, area_sqm: 28, pos_x: 200, pos_y: 240, beds: [{ size: "double", count: 1 }], description_en: "Cozy honeymoon ger", description_mn: "Хосуудад зориулсан гэр", sort_order: 6 },

  // Deluxe gers — premium row
  { name: "Делюкс 1", type: "deluxe", capacity: 4, price_per_night: 380000, area_sqm: 40, pos_x: 320, pos_y: 240, beds: [{ size: "double", count: 1 }, { size: "single", count: 2 }], description_en: "Deluxe suite with private deck", description_mn: "Тусгай тагттай делюкс гэр", sort_order: 7 },
  { name: "Делюкс 2", type: "deluxe", capacity: 4, price_per_night: 380000, area_sqm: 40, pos_x: 440, pos_y: 240, beds: [{ size: "double", count: 1 }, { size: "single", count: 2 }], description_en: "Deluxe lakeview suite", description_mn: "Нуур харсан делюкс гэр", sort_order: 8 },

  // Family large gers
  { name: "Гэр бүлийн 1", type: "deluxe", capacity: 6, price_per_night: 320000, area_sqm: 36, pos_x: 80, pos_y: 360, beds: [{ size: "double", count: 1 }, { size: "single", count: 4 }], description_en: "Family ger, fits 6", description_mn: "6 хүний гэр бүлийн гэр", sort_order: 9 },
  { name: "Гэр бүлийн 2", type: "deluxe", capacity: 6, price_per_night: 320000, area_sqm: 36, pos_x: 200, pos_y: 360, beds: [{ size: "double", count: 1 }, { size: "single", count: 4 }], description_en: "Family ger, fits 6", description_mn: "6 хүний гэр бүлийн гэр", sort_order: 10 },

  // Staff gers
  { name: "Ажилчны гэр 1", type: "staff", capacity: 4, price_per_night: 80000, area_sqm: 22, pos_x: 320, pos_y: 360, beds: [{ size: "single", count: 4 }], description_en: "Staff ger", description_mn: "Ажилчдын гэр", sort_order: 11 },
  { name: "Ажилчны гэр 2", type: "staff", capacity: 4, price_per_night: 80000, area_sqm: 22, pos_x: 440, pos_y: 360, beds: [{ size: "single", count: 4 }], description_en: "Staff ger", description_mn: "Ажилчдын гэр", sort_order: 12 },
];

async function seedGers() {
  console.log("⛺  Inserting 12 gers…");
  const { data, error } = await sb.from("gers").insert(GERS).select();
  if (error) throw error;
  return data;
}

// ── 3. OPERATORS ────────────────────────────────────────────────────────────
const OPERATORS = [
  { name: "Nomadic Trails LLC", contact_person: "Bat-Erdene D.", phone: "+976 9911 2233", email: "info@nomadictrails.mn", address: "Ulaanbaatar, Mongolia" },
  { name: "Discover Mongolia Tours", contact_person: "Sarangerel B.", phone: "+976 9933 4455", email: "booking@discovermongolia.mn", address: "Sukhbaatar Square 5, UB" },
  { name: "Steppe Explorers", contact_person: "Ganbaatar T.", phone: "+976 9977 1122", email: "tours@steppeexplorers.com", address: "Peace Avenue 21, UB" },
  { name: "Khangai Adventures", contact_person: "Oyuntsetseg M.", phone: "+976 9966 8899", email: "hello@khangaiadventures.mn", address: "Tsetserleg, Arkhangai" },
  { name: "Blue Sky Tour", contact_person: "Erdenebayar L.", phone: "+976 9988 7766", email: "blue@blueskytour.mn", address: "Chinggis Avenue 12, UB" },
  { name: "Eternal Sky Travel", contact_person: "Munkhtuya N.", phone: "+976 9912 3344", email: "contact@eternalsky.mn", address: "Bayanzurkh district, UB" },
];

async function seedOperators() {
  console.log("🏢  Inserting 6 operators…");
  const { data, error } = await sb.from("operators").insert(OPERATORS).select();
  if (error) throw error;
  return data;
}

// ── 4. BOOKINGS ─────────────────────────────────────────────────────────────
const SOURCES = ["operator", "website", "phone", "walkin"];

function bookingsFor(operators) {
  const op = (i) => operators[i].id;

  return [
    // ── PAST bookings (already checked out) ─────────────────────────────────
    { operator_id: op(0), trip_code: "NT-2026-04A", source: "operator", status: "confirmed", check_in: daysFromNow(-25), check_out: daysFromNow(-21), tourist_count: 8, staff_count: 1, guide_name: "Bayar G.", guide_phone: "+976 9900 1111", notes: "Spring photography group", payment_status: "paid", payment_amount: 1440000, total_amount: 1440000 },
    { operator_id: op(1), trip_code: "DM-2026-12", source: "operator", status: "confirmed", check_in: daysFromNow(-20), check_out: daysFromNow(-17), tourist_count: 6, staff_count: 1, guide_name: "Tugsuu B.", payment_status: "paid", payment_amount: 1080000, total_amount: 1080000 },
    { operator_id: op(2), trip_code: "SE-2026-08", source: "operator", status: "confirmed", check_in: daysFromNow(-15), check_out: daysFromNow(-10), tourist_count: 4, staff_count: 1, guide_name: "Naranbat O.", notes: "Birdwatching trip", payment_status: "partial", payment_amount: 600000, total_amount: 1100000 },
    { operator_id: op(4), trip_code: "BS-2026-22", source: "operator", status: "confirmed", check_in: daysFromNow(-12), check_out: daysFromNow(-8), tourist_count: 12, staff_count: 2, guide_name: "Ariunaa S.", payment_status: "paid", payment_amount: 2200000, total_amount: 2200000 },
    { operator_id: null, trip_code: null, source: "walkin", status: "confirmed", check_in: daysFromNow(-7), check_out: daysFromNow(-5), tourist_count: 2, staff_count: 0, notes: "Walk-in couple, French", payment_status: "paid", payment_amount: 360000, total_amount: 360000 },

    // ── OVERDUE PAYMENTS (past, still owe money — triggers RED bell) ────────
    { operator_id: op(1), trip_code: "DM-2026-15", source: "operator", status: "confirmed", check_in: daysFromNow(-10), check_out: daysFromNow(-6), tourist_count: 5, staff_count: 1, guide_name: "Munkh B.", notes: "Owes balance after partial deposit", payment_status: "partial", payment_amount: 400000, total_amount: 1300000 },
    { operator_id: op(3), trip_code: "KA-2026-09", source: "operator", status: "confirmed", check_in: daysFromNow(-6), check_out: daysFromNow(-3), tourist_count: 3, staff_count: 1, guide_name: "Otgontuya G.", notes: "Final payment pending", payment_status: "unpaid", payment_amount: 0, total_amount: 720000 },

    // ── ACTIVE NOW (currently staying) ──────────────────────────────────────
    { operator_id: op(0), trip_code: "NT-2026-05B", source: "operator", status: "confirmed", check_in: daysFromNow(-2), check_out: daysFromNow(2), tourist_count: 8, staff_count: 1, guide_name: "Battulga D.", notes: "Photography workshop", payment_status: "paid", payment_amount: 1440000, total_amount: 1440000 },
    { operator_id: op(5), trip_code: "ES-2026-04", source: "operator", status: "confirmed", check_in: daysFromNow(-3), check_out: daysFromNow(1), tourist_count: 4, staff_count: 1, guide_name: "Sukhbat T.", payment_status: "paid", payment_amount: 880000, total_amount: 880000 },

    // ── ARRIVING TODAY (triggers AMBER bell) ────────────────────────────────
    { operator_id: op(2), trip_code: "SE-2026-11", source: "operator", status: "confirmed", check_in: daysFromNow(0), check_out: daysFromNow(4), tourist_count: 6, staff_count: 1, guide_name: "Tuya N.", guide_phone: "+976 9911 7788", notes: "Arriving today!", payment_status: "partial", payment_amount: 500000, total_amount: 1320000 },
    { operator_id: null, trip_code: null, source: "website", status: "confirmed", check_in: daysFromNow(0), check_out: daysFromNow(3), tourist_count: 2, staff_count: 0, notes: "Direct online booking — anniversary trip", payment_status: "paid", payment_amount: 540000, total_amount: 540000 },

    // ── DEPARTING TODAY ─────────────────────────────────────────────────────
    { operator_id: op(4), trip_code: "BS-2026-25", source: "operator", status: "confirmed", check_in: daysFromNow(-3), check_out: daysFromNow(0), tourist_count: 5, staff_count: 1, guide_name: "Erdene K.", payment_status: "paid", payment_amount: 990000, total_amount: 990000 },

    // ── NEAR FUTURE (next 1-2 weeks) ────────────────────────────────────────
    { operator_id: op(0), trip_code: "NT-2026-05C", source: "operator", status: "confirmed", check_in: daysFromNow(3), check_out: daysFromNow(7), tourist_count: 10, staff_count: 2, guide_name: "Davaa B.", payment_status: "partial", payment_amount: 800000, total_amount: 1800000 },
    { operator_id: op(1), trip_code: "DM-2026-18", source: "operator", status: "tentative", check_in: daysFromNow(5), check_out: daysFromNow(8), tourist_count: 4, staff_count: 1, guide_name: "Bilguun T.", notes: "Awaiting deposit", payment_status: "unpaid", payment_amount: 0, total_amount: 720000 },
    { operator_id: null, trip_code: null, source: "phone", status: "confirmed", check_in: daysFromNow(7), check_out: daysFromNow(10), tourist_count: 3, staff_count: 0, notes: "Called from Germany", payment_status: "partial", payment_amount: 200000, total_amount: 540000 },
    { operator_id: op(3), trip_code: "KA-2026-14", source: "operator", status: "confirmed", check_in: daysFromNow(10), check_out: daysFromNow(15), tourist_count: 8, staff_count: 2, guide_name: "Saruul O.", payment_status: "paid", payment_amount: 1800000, total_amount: 1800000 },

    // ── FAR FUTURE (peak summer) ────────────────────────────────────────────
    { operator_id: op(5), trip_code: "ES-2026-06", source: "operator", status: "confirmed", check_in: daysFromNow(20), check_out: daysFromNow(24), tourist_count: 12, staff_count: 2, guide_name: "Munkhbat L.", payment_status: "partial", payment_amount: 1000000, total_amount: 2640000 },
    { operator_id: op(2), trip_code: "SE-2026-15", source: "operator", status: "tentative", check_in: daysFromNow(25), check_out: daysFromNow(30), tourist_count: 6, staff_count: 1, guide_name: "Khulan D.", notes: "Pending confirmation", payment_status: "unpaid", payment_amount: 0, total_amount: 1320000 },
    { operator_id: op(0), trip_code: "NT-2026-07A", source: "operator", status: "confirmed", check_in: daysFromNow(35), check_out: daysFromNow(42), tourist_count: 16, staff_count: 3, guide_name: "Naran M.", notes: "Big group — needs 4 gers", payment_status: "partial", payment_amount: 1500000, total_amount: 4320000 },
    { operator_id: op(1), trip_code: "DM-2026-25", source: "operator", status: "confirmed", check_in: daysFromNow(45), check_out: daysFromNow(50), tourist_count: 6, staff_count: 1, guide_name: "Bayasgalan R.", payment_status: "unpaid", payment_amount: 0, total_amount: 1980000 },
    { operator_id: null, trip_code: null, source: "website", status: "confirmed", check_in: daysFromNow(50), check_out: daysFromNow(54), tourist_count: 2, staff_count: 0, notes: "Online — Japan", payment_status: "paid", payment_amount: 720000, total_amount: 720000 },
    { operator_id: op(4), trip_code: "BS-2026-30", source: "operator", status: "tentative", check_in: daysFromNow(60), check_out: daysFromNow(65), tourist_count: 14, staff_count: 2, guide_name: "Tugs T.", notes: "Group of photographers from France", payment_status: "unpaid", payment_amount: 0, total_amount: 3000000 },

    // ── CANCELLED (won't show in calendar/dashboard) ────────────────────────
    { operator_id: op(2), trip_code: "SE-2026-13", source: "operator", status: "cancelled", check_in: daysFromNow(15), check_out: daysFromNow(20), tourist_count: 4, staff_count: 1, notes: "Cancelled by operator due to weather", payment_status: "unpaid", payment_amount: 0, total_amount: 1100000 },

    // ── UNASSIGNED tentative (will show in Calendar's Unassigned section) ──
    { operator_id: op(3), trip_code: "KA-2026-19", source: "operator", status: "tentative", check_in: daysFromNow(8), check_out: daysFromNow(12), tourist_count: 5, staff_count: 1, guide_name: "Erdembileg D.", notes: "Not yet assigned to a ger", payment_status: "unpaid", payment_amount: 0, total_amount: 1320000 },
  ];
}

async function seedBookings(operators) {
  console.log("📋  Inserting ~24 bookings…");
  const { data, error } = await sb.from("bookings").insert(bookingsFor(operators)).select();
  if (error) throw error;
  return data;
}

// ── 5. BOOKING-GER ASSIGNMENTS ──────────────────────────────────────────────
async function seedAssignments(bookings, gers) {
  console.log("🔗  Assigning bookings to gers…");

  const standard = ["Гэр 1", "Гэр 2", "Гэр 3", "Гэр 4"].map((n) =>
    gers.find((g) => g.name === n)
  );
  const family = ["Гэр бүлийн 1", "Гэр бүлийн 2"].map((n) =>
    gers.find((g) => g.name === n)
  );
  const deluxe = ["Делюкс 1", "Делюкс 2"].map((n) =>
    gers.find((g) => g.name === n)
  );
  const staff = ["Ажилчны гэр 1", "Ажилчны гэр 2"].map((n) =>
    gers.find((g) => g.name === n)
  );
  const honeymoon = ["Гэр 5", "Гэр 6"].map((n) =>
    gers.find((g) => g.name === n)
  );

  // Track which gers are booked on which date ranges so we don't conflict
  // with the database's own conflict-prevention trigger.
  // Map: ger_id -> Array<{check_in, check_out}>
  const occupancy = new Map();
  const overlaps = (gerId, ci, co) => {
    const ranges = occupancy.get(gerId);
    if (!ranges) return false;
    return ranges.some((r) => !(co <= r.check_in || ci >= r.check_out));
  };
  const reserve = (gerId, ci, co) => {
    const ranges = occupancy.get(gerId) || [];
    ranges.push({ check_in: ci, check_out: co });
    occupancy.set(gerId, ranges);
  };
  const tryAssign = (b, candidates, type = "tourist") => {
    for (const g of candidates) {
      if (!overlaps(g.id, b.check_in, b.check_out)) {
        reserve(g.id, b.check_in, b.check_out);
        return { booking_id: b.id, ger_id: g.id, guest_type: type };
      }
    }
    return null;
  };

  const links = [];
  let unassignedCount = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    if (b.notes?.includes("Not yet assigned")) continue;

    const total = (b.tourist_count || 0) + (b.staff_count || 0);

    // Pick candidate pools by group size
    let pool;
    if (total <= 2 && b.source === "website") pool = [...honeymoon, ...standard, ...deluxe];
    else if (total <= 2) pool = [...standard, ...honeymoon, ...deluxe];
    else if (total <= 4) pool = [...deluxe, ...family, ...standard];
    else if (total <= 6) pool = [...family, ...deluxe];
    else pool = [...family, ...standard, ...deluxe];

    const link = tryAssign(b, pool);
    if (link) {
      links.push(link);
    } else {
      unassignedCount++;
      continue;
    }

    // Big groups need a second ger
    if (total > 4) {
      const remainingPool = [...standard, ...family, ...deluxe].filter(
        (g) => g.id !== link.ger_id
      );
      const second = tryAssign(b, remainingPool);
      if (second) links.push(second);
    }

    // Big group with staff — try a staff ger
    if ((b.staff_count || 0) > 0 && total > 6) {
      const staffLink = tryAssign(b, staff, "staff");
      if (staffLink) links.push(staffLink);
    }
  }

  if (unassignedCount > 0) {
    console.log(`    ⚠  ${unassignedCount} booking(s) couldn't fit — left in Unassigned tray (expected for stress-test data)`);
  }

  // Insert in chunks
  const CHUNK = 50;
  for (let i = 0; i < links.length; i += CHUNK) {
    const { error } = await sb.from("booking_gers").insert(links.slice(i, i + CHUNK));
    if (error) throw error;
  }
  return links.length;
}

// ── 6. GUESTS ───────────────────────────────────────────────────────────────
const GUEST_NAMES = [
  { name: "Élise Moreau", nationality: "French", passport_no: "FR9912345" },
  { name: "James Thompson", nationality: "British", passport_no: "GB554321" },
  { name: "Kenji Watanabe", nationality: "Japanese", passport_no: "JP223344" },
  { name: "Sarah Martinez", nationality: "Spanish", passport_no: "ES887766" },
  { name: "Hans Müller", nationality: "German", passport_no: "DE112233" },
  { name: "Б. Болдбаатар", nationality: "Mongolian", passport_no: "MN445566" },
  { name: "Liu Wei", nationality: "Chinese", passport_no: "CN778899" },
  { name: "Anna Kowalski", nationality: "Polish", passport_no: "PL334455" },
  { name: "Marco Rossi", nationality: "Italian", passport_no: "IT556677" },
  { name: "Sophie Dubois", nationality: "French", passport_no: "FR223388" },
  { name: "David Chen", nationality: "Canadian", passport_no: "CA998877" },
  { name: "Yuki Tanaka", nationality: "Japanese", passport_no: "JP554477" },
];

async function seedGuests(bookings) {
  console.log("👤  Inserting guests…");
  const guests = [];
  let i = 0;
  // Attach guests to all confirmed/tentative bookings
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const total = b.tourist_count || 0;
    // Add 1-2 named guests per booking (don't model every single tourist)
    const count = Math.min(2, total);
    for (let n = 0; n < count; n++) {
      const tpl = GUEST_NAMES[i % GUEST_NAMES.length];
      guests.push({
        booking_id: b.id,
        name: tpl.name,
        nationality: tpl.nationality,
        passport_no: `${tpl.passport_no}-${i}`,
        phone: `+${Math.floor(Math.random() * 99 + 1)}-555-${String(1000 + i).padStart(4, "0")}`,
        email: tpl.name.toLowerCase().replace(/[^a-z]/g, "") + "@example.com",
      });
      i++;
    }
  }
  const { error } = await sb.from("guests").insert(guests);
  if (error) throw error;
  return guests.length;
}

// ── 7. TRANSACTIONS ─────────────────────────────────────────────────────────
function generateTransactions() {
  const txs = [];
  // Past 6 months — typical seasonal income/expense pattern
  for (let m = 0; m < 6; m++) {
    const d = monthsAgo(m);
    const month = d.getMonth();
    const yyyymm = `${d.getFullYear()}-${String(month + 1).padStart(2, "0")}`;
    const isSummer = month >= 4 && month <= 8; // May-Sep

    if (isSummer) {
      // Income: bookings (3-5 per month)
      const incomeCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < incomeCount; i++) {
        txs.push({
          date: `${yyyymm}-${String(5 + i * 4).padStart(2, "0")}`,
          amount: 500000 + Math.floor(Math.random() * 1500000),
          type: "income",
          category: "booking",
          description: `Operator payment — ${i + 1}`,
          counterparty: ["Nomadic Trails LLC", "Discover Mongolia Tours", "Steppe Explorers", "Khangai Adventures"][i % 4],
          source: "manual",
        });
      }
    }

    // Expenses every month (winter has staff salary even when no income)
    txs.push({
      date: `${yyyymm}-05`,
      amount: 2400000,
      type: "expense",
      category: "salary",
      description: "Monthly staff salary",
      counterparty: "Staff payroll",
      source: "manual",
    });
    txs.push({
      date: `${yyyymm}-10`,
      amount: 150000 + Math.floor(Math.random() * 200000),
      type: "expense",
      category: "supply",
      description: "Kitchen + cleaning supplies",
      counterparty: "Local market",
      source: "manual",
    });
    if (isSummer) {
      txs.push({
        date: `${yyyymm}-15`,
        amount: 600000 + Math.floor(Math.random() * 400000),
        type: "expense",
        category: "meal",
        description: "Meat, dairy, vegetables for guest meals",
        counterparty: "Bayan herder cooperative",
        source: "manual",
      });
      if (m === 0 || m === 1) {
        txs.push({
          date: `${yyyymm}-20`,
          amount: 350000,
          type: "expense",
          category: "maintenance",
          description: "Ger felt repair + paint",
          counterparty: "Local craftsmen",
          source: "manual",
        });
      }
    }
  }
  return txs;
}

async function seedTransactions() {
  console.log("💰  Inserting finance transactions…");
  const txs = generateTransactions();
  const { error } = await sb.from("transactions").insert(txs);
  if (error) throw error;
  return txs.length;
}

// ── 8. ADMIN USER ───────────────────────────────────────────────────────────
const ADMIN_EMAIL = "admin@tsaidam.test";
const ADMIN_PASSWORD = "tsaidam2026";

async function seedAdminUser() {
  console.log("🔑  Ensuring admin user exists…");
  // Look up existing user first to keep this idempotent
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users?.find((u) => u.email === ADMIN_EMAIL);
  if (existing) {
    // Reset password so the user always knows what to type
    await sb.auth.admin.updateUserById(existing.id, { password: ADMIN_PASSWORD });
    return { created: false };
  }
  const { error } = await sb.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return { created: true };
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  await clean();
  const gers = await seedGers();
  const operators = await seedOperators();
  const bookings = await seedBookings(operators);
  const linkCount = await seedAssignments(bookings, gers);
  const guestCount = await seedGuests(bookings);
  const txCount = await seedTransactions();
  const admin = await seedAdminUser();

  console.log("");
  console.log("✅  Seed complete in", Math.round((Date.now() - t0) / 100) / 10, "s");
  console.log("    ⛺  Gers:           ", gers.length);
  console.log("    🏢  Operators:      ", operators.length);
  console.log("    📋  Bookings:       ", bookings.length);
  console.log("    🔗  Ger assignments:", linkCount);
  console.log("    👤  Guests:         ", guestCount);
  console.log("    💰  Transactions:   ", txCount);
  console.log("    🔑  Admin user:     ", admin.created ? "CREATED" : "exists (password reset)");
  console.log("");
  console.log("┌────────────────────────────────────────────────────────────┐");
  console.log("│  LOGIN CREDENTIALS                                         │");
  console.log("│                                                            │");
  console.log("│   Email:     " + ADMIN_EMAIL.padEnd(46) + "│");
  console.log("│   Password:  " + ADMIN_PASSWORD.padEnd(46) + "│");
  console.log("│                                                            │");
  console.log("│   Login URL: http://localhost:3000/en/login                │");
  console.log("└────────────────────────────────────────────────────────────┘");
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
