-- Repoint FKs from auth.users → public.profiles so PostgREST embeds
-- (profile:profiles!tickets_user_id_fkey(...)) resolve. profiles.id mirrors
-- auth.users.id via the handle_new_user trigger so values stay valid.

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_user_id_fkey;
ALTER TABLE public.ticket_messages
  ADD CONSTRAINT ticket_messages_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ticket_attachments DROP CONSTRAINT IF EXISTS ticket_attachments_uploaded_by_fkey;
ALTER TABLE public.ticket_attachments
  ADD CONSTRAINT ticket_attachments_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;