
-- 1) Prevent customers from escalating ticket fields
CREATE OR REPLACE FUNCTION public.enforce_customer_ticket_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff_or_admin(auth.uid()) THEN
    NEW.priority := OLD.priority;
    NEW.status := OLD.status;
    NEW.assigned_to := OLD.assigned_to;
    NEW.category := OLD.category;
    NEW.main_category := OLD.main_category;
    NEW.suggested_department := OLD.suggested_department;
    NEW.sentiment := OLD.sentiment;
    NEW.ai_classification := OLD.ai_classification;
    NEW.ai_confidence := OLD.ai_confidence;
    NEW.ai_response := OLD.ai_response;
    NEW.ai_response_tone := OLD.ai_response_tone;
    NEW.ai_response_edited := OLD.ai_response_edited;
    NEW.resolved_at := OLD.resolved_at;
    NEW.closed_at := OLD.closed_at;
    NEW.first_response_at := OLD.first_response_at;
    NEW.ticket_number := OLD.ticket_number;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS a_enforce_customer_ticket_update ON public.tickets;
CREATE TRIGGER a_enforce_customer_ticket_update
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_customer_ticket_update();

-- 2) Revoke customer INSERT on ticket_activity (system-only via SECURITY DEFINER triggers)
DROP POLICY IF EXISTS "Insert activity for accessible tickets" ON public.ticket_activity;
CREATE POLICY "Staff/admin insert activity"
ON public.ticket_activity
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- 3) Lock down SECURITY DEFINER function exposure
REVOKE EXECUTE ON FUNCTION public.claim_signup_role(app_role, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_signup_role(app_role, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_or_admin(uuid) FROM PUBLIC, anon;
