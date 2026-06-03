
-- Activity action enum
DO $$ BEGIN
  CREATE TYPE public.ticket_action AS ENUM (
    'created','status_changed','priority_changed','category_changed',
    'assigned','unassigned','escalated','resolved','reopened','closed','message_added'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add tracking columns to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Ticket activity log
CREATE TABLE IF NOT EXISTS public.ticket_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  actor_id uuid,
  action public.ticket_action NOT NULL,
  from_value text,
  to_value text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ticket_activity TO authenticated;
GRANT ALL ON public.ticket_activity TO service_role;

ALTER TABLE public.ticket_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read activity of accessible tickets" ON public.ticket_activity;
CREATE POLICY "Read activity of accessible tickets"
ON public.ticket_activity FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tickets t
  WHERE t.id = ticket_activity.ticket_id
    AND (t.user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
));

DROP POLICY IF EXISTS "Insert activity for accessible tickets" ON public.ticket_activity;
CREATE POLICY "Insert activity for accessible tickets"
ON public.ticket_activity FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tickets t
  WHERE t.id = ticket_activity.ticket_id
    AND (t.user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()))
));

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket ON public.ticket_activity(ticket_id, created_at DESC);

-- Trigger: log changes on tickets
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_activity (ticket_id, actor_id, action, to_value)
    VALUES (NEW.id, NEW.user_id, 'created', NEW.status::text);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ticket_activity (ticket_id, actor_id, action, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status::text, NEW.status::text);
      IF NEW.status = 'resolved' AND NEW.resolved_at IS NULL THEN
        NEW.resolved_at := now();
        INSERT INTO public.ticket_activity (ticket_id, actor_id, action) VALUES (NEW.id, auth.uid(), 'resolved');
      END IF;
      IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN
        NEW.closed_at := now();
        INSERT INTO public.ticket_activity (ticket_id, actor_id, action) VALUES (NEW.id, auth.uid(), 'closed');
      END IF;
      IF NEW.status = 'escalated' THEN
        INSERT INTO public.ticket_activity (ticket_id, actor_id, action) VALUES (NEW.id, auth.uid(), 'escalated');
      END IF;
      IF OLD.status IN ('resolved','closed') AND NEW.status NOT IN ('resolved','closed') THEN
        INSERT INTO public.ticket_activity (ticket_id, actor_id, action) VALUES (NEW.id, auth.uid(), 'reopened');
      END IF;
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.ticket_activity (ticket_id, actor_id, action, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority::text, NEW.priority::text);
    END IF;
    IF NEW.category IS DISTINCT FROM OLD.category THEN
      INSERT INTO public.ticket_activity (ticket_id, actor_id, action, from_value, to_value)
      VALUES (NEW.id, auth.uid(), 'category_changed', OLD.category::text, NEW.category::text);
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      INSERT INTO public.ticket_activity (ticket_id, actor_id, action, from_value, to_value)
      VALUES (NEW.id, auth.uid(),
              CASE WHEN NEW.assigned_to IS NULL THEN 'unassigned' ELSE 'assigned' END,
              OLD.assigned_to::text, NEW.assigned_to::text);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_ticket_changes ON public.tickets;
CREATE TRIGGER trg_log_ticket_changes
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_changes();

-- Trigger: log messages + set first_response_at on first staff reply
CREATE OR REPLACE FUNCTION public.log_ticket_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ticket_owner uuid;
BEGIN
  SELECT user_id INTO ticket_owner FROM public.tickets WHERE id = NEW.ticket_id;
  INSERT INTO public.ticket_activity (ticket_id, actor_id, action, metadata)
  VALUES (NEW.ticket_id, NEW.user_id, 'message_added',
          jsonb_build_object('internal', NEW.is_internal_note));
  -- First response from staff/admin (not internal note, not the ticket owner)
  IF NEW.user_id IS DISTINCT FROM ticket_owner AND NOT NEW.is_internal_note THEN
    UPDATE public.tickets
       SET first_response_at = COALESCE(first_response_at, now())
     WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_ticket_message ON public.ticket_messages;
CREATE TRIGGER trg_log_ticket_message
AFTER INSERT ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_message();
