-- ============================================
-- ATOMIC BOOKING + GER ASSIGNMENT
-- ============================================
-- The /api/gers/[id]/bookings POST handler currently does two non-atomic
-- inserts (bookings, then booking_gers) and falls back to a manual rollback
-- DELETE on failure. If that DELETE itself fails, an orphaned booking is
-- left behind.
--
-- This RPC wraps both inserts in a single transaction so Postgres handles
-- rollback automatically.

CREATE OR REPLACE FUNCTION create_booking_with_ger(
  p_ger_id uuid,
  p_booking jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_booking bookings%ROWTYPE;
  result jsonb;
BEGIN
  -- Insert the booking row from the JSON payload
  INSERT INTO bookings (
    operator_id, trip_code, source, status,
    check_in, check_out, tourist_count, staff_count,
    guide_name, guide_phone, notes,
    payment_status, payment_amount, total_amount
  )
  VALUES (
    NULLIF(p_booking->>'operator_id', '')::uuid,
    p_booking->>'trip_code',
    p_booking->>'source',
    COALESCE(p_booking->>'status', 'tentative'),
    (p_booking->>'check_in')::date,
    (p_booking->>'check_out')::date,
    COALESCE((p_booking->>'tourist_count')::int, 0),
    COALESCE((p_booking->>'staff_count')::int, 0),
    p_booking->>'guide_name',
    p_booking->>'guide_phone',
    p_booking->>'notes',
    COALESCE(p_booking->>'payment_status', 'unpaid'),
    COALESCE((p_booking->>'payment_amount')::numeric, 0),
    COALESCE((p_booking->>'total_amount')::numeric, 0)
  )
  RETURNING * INTO new_booking;

  -- Link the booking to the ger; the existing trigger
  -- check_ger_availability() runs here and will raise if the ger is double-booked.
  INSERT INTO booking_gers (booking_id, ger_id)
  VALUES (new_booking.id, p_ger_id);

  -- Return the new booking joined with operator name
  SELECT to_jsonb(b) || jsonb_build_object(
    'operators', CASE WHEN o.id IS NULL THEN NULL
                      ELSE jsonb_build_object('name', o.name) END
  )
  INTO result
  FROM bookings b
  LEFT JOIN operators o ON o.id = b.operator_id
  WHERE b.id = new_booking.id;

  RETURN result;
END;
$$;

-- Allow authenticated users (admin) to call this RPC
GRANT EXECUTE ON FUNCTION create_booking_with_ger(uuid, jsonb) TO authenticated;
