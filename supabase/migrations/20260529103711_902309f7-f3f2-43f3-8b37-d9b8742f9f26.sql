CREATE OR REPLACE FUNCTION public.claim_signup_role(_role app_role, _code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  expected text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF _role = 'customer' THEN
    RETURN true;
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

  -- Enforce single-role-per-user: remove any existing roles, then assign the claimed one
  DELETE FROM public.user_roles WHERE user_id = uid;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, _role);

  RETURN true;
END;
$function$;