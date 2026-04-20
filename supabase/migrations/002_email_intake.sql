-- ============================================
-- EMAIL_INTAKE: Inbound operator emails + PDF attachments
-- ============================================
-- Operators send bookings via email (with PDF attached). A Gmail-side
-- forwarder (Apps Script or similar) POSTs each relevant email to
-- /api/email-intake/webhook. Admin reviews pending rows in the Inbox page
-- and triggers Claude parsing on the stored PDF.
--
-- `attachment_base64` is the raw PDF bytes, base64-encoded. For very large
-- PDFs we could move this to Supabase Storage later, but inline keeps the
-- intake path zero-config.

CREATE TABLE email_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email metadata
  from_address text NOT NULL,
  from_name text,
  subject text,
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text,                    -- RFC 5322 Message-ID, de-dupe key
  body_text text,

  -- Attachment (one PDF per email for now — the common case)
  attachment_filename text,
  attachment_mime text,
  attachment_base64 text,             -- base64-encoded PDF bytes
  attachment_size_bytes int,

  -- Admin workflow state
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'parsed', 'imported', 'ignored', 'error')),
  operator_id uuid REFERENCES operators(id) ON DELETE SET NULL,
  parse_result jsonb,                 -- cached Claude output after "Parse"
  parse_error text,
  imported_booking_count int DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (message_id)
);

CREATE INDEX idx_email_intake_status ON email_intake(status);
CREATE INDEX idx_email_intake_received ON email_intake(received_at DESC);
CREATE INDEX idx_email_intake_operator ON email_intake(operator_id);

-- Auto-update updated_at
CREATE TRIGGER trigger_email_intake_updated_at
  BEFORE UPDATE ON email_intake
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: admin-only
ALTER TABLE email_intake ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON email_intake
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
