-- Tsaidam Camp Database Schema
-- All tables for booking management, CRM, finance, and CMS

-- ============================================
-- OPERATORS: Tour operator companies
-- ============================================
CREATE TABLE operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  phone text,
  fax text,
  email text,
  website text,
  address text,
  contact_person text,
  contact_phone text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- GERS: Camp accommodation units (40 gers)
-- ============================================
CREATE TABLE gers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('1-bed', '2-bed', 'deluxe', 'staff')),
  capacity int NOT NULL DEFAULT 2,
  price_per_night numeric(10, 2),
  is_available boolean DEFAULT true,
  description_mn text,
  description_en text,
  sort_order int DEFAULT 0,
  image_url text,
  pos_x float DEFAULT 0,
  pos_y float DEFAULT 0,
  width float DEFAULT 60,
  height float DEFAULT 60,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- BOOKINGS: Core reservation records
-- ============================================
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES operators(id) ON DELETE SET NULL,
  trip_code text,
  source text NOT NULL CHECK (source IN ('operator', 'website', 'phone', 'walkin')),
  status text NOT NULL DEFAULT 'tentative' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  check_in date NOT NULL,
  check_out date NOT NULL,
  tourist_count int DEFAULT 0,
  staff_count int DEFAULT 0,
  guide_name text,
  guide_phone text,
  notes text,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_amount numeric(12, 2) DEFAULT 0,
  total_amount numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- ============================================
-- BOOKING_GERS: Ger assignments per booking
-- ============================================
CREATE TABLE booking_gers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ger_id uuid NOT NULL REFERENCES gers(id) ON DELETE CASCADE,
  guest_type text DEFAULT 'tourist' CHECK (guest_type IN ('tourist', 'staff'))
);

-- ============================================
-- MEALS: Daily meal tracking per booking
-- ============================================
CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  date date NOT NULL,
  breakfast_tourist int DEFAULT 0,
  breakfast_staff int DEFAULT 0,
  lunch_tourist int DEFAULT 0,
  lunch_staff int DEFAULT 0,
  dinner_tourist int DEFAULT 0,
  dinner_staff int DEFAULT 0,
  notes text,

  UNIQUE(booking_id, date)
);

-- ============================================
-- GUESTS: Individual guest records
-- ============================================
CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  name text NOT NULL,
  nationality text,
  passport_no text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- TRANSACTIONS: Financial records
-- ============================================
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  amount numeric(12, 2) NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text CHECK (category IN ('booking', 'meal', 'salary', 'service', 'supply', 'maintenance', 'other')),
  description text,
  counterparty text,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'gmail')),
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SITE_CONTENT: CMS for public website
-- ============================================
CREATE TABLE site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section text NOT NULL,
  content_mn jsonb DEFAULT '{}',
  content_en jsonb DEFAULT '{}',
  sort_order int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),

  UNIQUE(page, section)
);

-- ============================================
-- PROGRAMS: Camp activities/events
-- ============================================
CREATE TABLE programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_mn text NOT NULL,
  title_en text,
  description_mn text,
  description_en text,
  duration text,
  price numeric(10, 2),
  is_active boolean DEFAULT true,
  image_url text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- OVERBOOKING PREVENTION
-- Trigger function that checks for date overlap
-- ============================================
CREATE OR REPLACE FUNCTION check_ger_availability()
RETURNS TRIGGER AS $$
DECLARE
  booking_check_in date;
  booking_check_out date;
  booking_status text;
  conflict_count int;
BEGIN
  SELECT b.check_in, b.check_out, b.status
  INTO booking_check_in, booking_check_out, booking_status
  FROM bookings b WHERE b.id = NEW.booking_id;

  IF booking_status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO conflict_count
  FROM booking_gers bg
  JOIN bookings b ON b.id = bg.booking_id
  WHERE bg.ger_id = NEW.ger_id
    AND bg.id IS DISTINCT FROM NEW.id
    AND b.status != 'cancelled'
    AND b.check_in < booking_check_out
    AND b.check_out > booking_check_in;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Ger % is already booked for the dates % to %',
      NEW.ger_id, booking_check_in, booking_check_out;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_ger_availability
  BEFORE INSERT OR UPDATE ON booking_gers
  FOR EACH ROW
  EXECUTE FUNCTION check_ger_availability();

-- ============================================
-- AUTO-UPDATE updated_at on bookings
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- INDEXES for common queries
-- ============================================
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_source ON bookings(source);
CREATE INDEX idx_bookings_operator ON bookings(operator_id);
CREATE INDEX idx_booking_gers_ger ON booking_gers(ger_id);
CREATE INDEX idx_booking_gers_booking ON booking_gers(booking_id);
CREATE INDEX idx_meals_date ON meals(date);
CREATE INDEX idx_meals_booking ON meals(booking_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_guests_booking ON guests(booking_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE gers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_gers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Admin full access (authenticated users)
CREATE POLICY "Admin full access" ON operators FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON gers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON booking_gers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON meals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON guests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON site_content FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read access for website content
CREATE POLICY "Public read gers" ON gers FOR SELECT TO anon USING (is_available = true);
CREATE POLICY "Public read programs" ON programs FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public read content" ON site_content FOR SELECT TO anon USING (true);

-- Public can create bookings (from website)
CREATE POLICY "Public create bookings" ON bookings FOR INSERT TO anon WITH CHECK (source = 'website');
