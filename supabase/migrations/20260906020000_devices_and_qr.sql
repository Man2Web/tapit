-- Migration: NFC Devices & Smart QR System
CREATE TABLE IF NOT EXISTS public.nfc_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'card', -- card, sticker, tag, badge
  nfc_uid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, lost
  last_tapped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.smart_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  qr_name TEXT NOT NULL,
  destination_type TEXT NOT NULL DEFAULT 'profile', -- profile, review, event, product, menu, custom
  destination_url TEXT NOT NULL,
  scan_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for NFC Devices
ALTER TABLE public.nfc_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own NFC devices"
  ON public.nfc_devices
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- RLS for Smart QR Codes
ALTER TABLE public.smart_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own Smart QR codes"
  ON public.smart_qr_codes
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Public read active Smart QR codes"
  ON public.smart_qr_codes
  FOR SELECT
  USING (is_active = true);
