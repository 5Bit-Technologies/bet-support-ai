
-- Extend ticket categories for internal staff tickets
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'it';
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'facilities';
ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'internal_security';

-- Secure self-service role claim used during signup.
-- Customers default to 'customer' via handle_new_user(); staff/admin must
-- provide a valid access code. Codes are intentionally embedded server-side
-- (SECURITY DEFINER) so the publishable key cannot bypass user_roles RLS.
CREATE OR REPLACE FUNCTION public.claim_signup_role(_role app_role, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  expected text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _role = 'customer' THEN
    RETURN true; -- default role already assigned by trigger
  END IF;

  IF _role = 'staff' THEN
    expected := 'HELIX-STAFF-2026';
  ELSIF _role = 'admin' THEN
    expected := 'HELIX-ADMIN-2026';
  ELSE
    RAISE EXCEPTION 'invalid role';
  END IF;

  IF _code IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'invalid access code';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_signup_role(app_role, text) TO authenticated;
