-- ============================================================
-- Adds bed configuration (JSONB) and physical area (sqm) to gers
-- ------------------------------------------------------------
-- beds: array of { size: text, count: int }
--   size is free-string so the front-end can expand defaults
--   without a schema change. Example:
--   [{ "size": "single", "count": 2 }, { "size": "queen", "count": 1 }]
-- area_sqm: numeric, used by the layout canvas to scale ger
--   icons proportionally to their real-world size.
-- ============================================================

ALTER TABLE gers
  ADD COLUMN IF NOT EXISTS beds jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS area_sqm numeric(6, 2);

-- Backfill sensible defaults so existing rows render at a reasonable size.
UPDATE gers SET area_sqm = 28 WHERE area_sqm IS NULL AND type = 'deluxe';
UPDATE gers SET area_sqm = 22 WHERE area_sqm IS NULL AND type = '2-bed';
UPDATE gers SET area_sqm = 18 WHERE area_sqm IS NULL AND type = '1-bed';
UPDATE gers SET area_sqm = 16 WHERE area_sqm IS NULL AND type = 'staff';

-- Backfill bed defaults so the editor has a starting point.
UPDATE gers
SET beds = '[{"size":"queen","count":1}]'::jsonb
WHERE beds = '[]'::jsonb AND type = 'deluxe';

UPDATE gers
SET beds = '[{"size":"single","count":2}]'::jsonb
WHERE beds = '[]'::jsonb AND type = '2-bed';

UPDATE gers
SET beds = '[{"size":"single","count":1}]'::jsonb
WHERE beds = '[]'::jsonb AND type = '1-bed';

UPDATE gers
SET beds = '[{"size":"single","count":2}]'::jsonb
WHERE beds = '[]'::jsonb AND type = 'staff';
