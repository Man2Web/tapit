-- Phase 1: Core Identity Enhancements

-- 1. Add follow_up_at to leads for follow-up scheduling
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

-- Index for efficient follow-up queries
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_at
  ON public.leads(follow_up_at)
  WHERE follow_up_at IS NOT NULL;

-- 2. Owner insert policy for leads (allows manual lead creation from the app)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads' AND policyname = 'leads: owner insert'
  ) THEN
    CREATE POLICY "leads: owner insert"
      ON public.leads FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = leads.profile_id AND p.owner_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

-- 3. Enhanced get_profile_insights with date range filtering
CREATE OR REPLACE FUNCTION public.get_profile_insights_range(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  views BIGINT,
  qr_views BIGINT,
  vcard_saves BIGINT,
  link_clicks BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT
    count(*) FILTER (WHERE event = 'view') AS views,
    count(*) FILTER (WHERE event = 'view' AND source = 'qr') AS qr_views,
    count(*) FILTER (WHERE event = 'vcard_save') AS vcard_saves,
    count(*) FILTER (WHERE event = 'link_click') AS link_clicks
  FROM public.profile_events
  WHERE profile_id = (
    SELECT id FROM public.profiles
    WHERE owner_id = (SELECT auth.uid()) AND is_primary = true
  )
  AND (p_from IS NULL OR created_at >= p_from)
  AND (p_to IS NULL OR created_at <= p_to);
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_insights_range(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
