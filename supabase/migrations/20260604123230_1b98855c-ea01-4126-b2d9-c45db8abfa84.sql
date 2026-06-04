
-- New subcategories for Online Gambling, Physical Casino, Internal Staff
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'responsible_gambling';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'security_incident';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'theft';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'lost_found';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'customer_complaint';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'property_damage';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'facility_issue';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'venue_services';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'operations';
ALTER TYPE public.ticket_category ADD VALUE IF NOT EXISTS 'maintenance';

-- Track main category bucket + AI-generated response
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS main_category text,
  ADD COLUMN IF NOT EXISTS ai_response text,
  ADD COLUMN IF NOT EXISTS ai_response_tone text,
  ADD COLUMN IF NOT EXISTS ai_response_edited boolean NOT NULL DEFAULT false;
