-- =============================================
-- 1. Create tickets table for request tracking
-- =============================================
CREATE TABLE public.request_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.device_requests(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL UNIQUE,
  encrypted_data TEXT, -- For sensitive data encryption
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket audit log for full audit trail
CREATE TABLE public.ticket_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.request_tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by uuid NOT NULL,
  details TEXT,
  encrypted_details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS for tickets - users can view their own, admins/approvers can view all
CREATE POLICY "Users can view own tickets"
ON public.request_tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.device_requests dr
    WHERE dr.id = request_tickets.request_id
    AND dr.requester_id = auth.uid()
  )
);

CREATE POLICY "Admins/Approvers can view all tickets"
ON public.request_tickets FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'approver'));

CREATE POLICY "System can create tickets"
ON public.request_tickets FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update tickets"
ON public.request_tickets FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'approver'));

-- RLS for audit log
CREATE POLICY "Users can view own audit logs"
ON public.ticket_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.request_tickets rt
    JOIN public.device_requests dr ON dr.id = rt.request_id
    WHERE rt.id = ticket_audit_log.ticket_id
    AND dr.requester_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all audit logs"
ON public.ticket_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.ticket_audit_log FOR INSERT
WITH CHECK (true);

-- =============================================
-- 2. Add phone number to profiles
-- =============================================
-- Phone column already exists, just ensure it's there
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- =============================================
-- 3. Create function to generate ticket number
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  ticket_num TEXT;
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.request_tickets
  WHERE ticket_number LIKE year_part || '-%';
  
  ticket_num := year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  NEW.ticket_number := ticket_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_ticket_number_trigger
BEFORE INSERT ON public.request_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_number();

-- =============================================
-- 4. Create function to auto-create ticket on request
-- =============================================
CREATE OR REPLACE FUNCTION public.create_ticket_for_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.request_tickets (request_id, encrypted_data, status)
  VALUES (
    NEW.id, 
    encode(convert_to(NEW.device_type || '|' || NEW.purpose, 'UTF8'), 'base64'),
    'open'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_ticket_on_request
AFTER INSERT ON public.device_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_ticket_for_request();

-- =============================================
-- 5. CRITICAL: Server-side self-approval prevention
-- =============================================
-- Drop existing UPDATE policy for approvers
DROP POLICY IF EXISTS "Approvers can update requests" ON public.device_requests;

-- Create new policy that prevents self-approval
CREATE POLICY "Approvers can update requests but not own"
ON public.device_requests FOR UPDATE
USING (
  (has_role(auth.uid(), 'approver') OR has_role(auth.uid(), 'admin'))
  AND requester_id != auth.uid()
);

-- =============================================
-- 6. Update tickets timestamp trigger
-- =============================================
CREATE TRIGGER update_request_tickets_updated_at
BEFORE UPDATE ON public.request_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 7. Add indexes for performance
-- =============================================
CREATE INDEX idx_request_tickets_request_id ON public.request_tickets(request_id);
CREATE INDEX idx_request_tickets_ticket_number ON public.request_tickets(ticket_number);
CREATE INDEX idx_ticket_audit_log_ticket_id ON public.ticket_audit_log(ticket_id);