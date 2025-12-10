-- Fix unrestricted notification creation
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Admins and approvers can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'approver'::app_role));

-- Fix unrestricted ticket creation (triggers use SECURITY DEFINER so they bypass RLS)
-- But we should still restrict direct inserts
DROP POLICY IF EXISTS "System can create tickets" ON public.request_tickets;
CREATE POLICY "Only triggers can create tickets"
ON public.request_tickets FOR INSERT
WITH CHECK (false); -- Direct inserts blocked; trigger with SECURITY DEFINER bypasses this

-- Fix unrestricted audit log creation
DROP POLICY IF EXISTS "System can insert audit logs" ON public.ticket_audit_log;
CREATE POLICY "Admins and approvers can create audit logs"
ON public.ticket_audit_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'approver'::app_role));

-- Restrict stock movements visibility to admins only
DROP POLICY IF EXISTS "All can view stock movements" ON public.stock_movements;
CREATE POLICY "Admins can view stock movements"
ON public.stock_movements FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));