-- Migration: Flexible Content Block System
CREATE TABLE IF NOT EXISTS public.profile_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast ordering and lookup by profile
CREATE INDEX IF NOT EXISTS idx_profile_blocks_profile_position ON public.profile_blocks(profile_id, position);

-- Enable RLS
ALTER TABLE public.profile_blocks ENABLE ROW LEVEL SECURITY;

-- Public read access for blocks of active profiles
CREATE POLICY "Public read for visible blocks"
  ON public.profile_blocks
  FOR SELECT
  USING (
    is_visible = true AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_blocks.profile_id AND p.is_active = true
    )
  );

-- Owner full access to their profile blocks
CREATE POLICY "Owners manage own profile blocks"
  ON public.profile_blocks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_blocks.profile_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_blocks.profile_id AND p.owner_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_profile_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_blocks_modtime
  BEFORE UPDATE ON public.profile_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_blocks_updated_at();
