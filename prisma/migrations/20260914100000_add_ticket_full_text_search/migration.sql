-- Additive PostgreSQL full-text search support for ticket title/description.
-- This migration intentionally leaves prisma/schema.prisma unchanged because
-- search_vector is an implementation detail queried through parameterized SQL.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = public
AS $$
  SELECT public.unaccent('public.unaccent', value)
$$;

ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'french',
      public.immutable_unaccent(coalesce(title, '') || ' ' || coalesce(description, ''))
    )
  ) STORED;

-- Keep this statement compatible with transaction-wrapped deployments:
-- PostgreSQL rejects concurrent index creation in a transaction (SQLSTATE 25001).
CREATE INDEX IF NOT EXISTS "Ticket_search_vector_gin_idx"
  ON "Ticket" USING GIN (search_vector);
