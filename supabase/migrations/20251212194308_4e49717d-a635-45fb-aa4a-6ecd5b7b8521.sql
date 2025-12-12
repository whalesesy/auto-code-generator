-- Add RLS policy to allow staff to update their own issued requests to pending_return status
CREATE POLICY "Staff can mark own requests as pending return" 
ON public.device_requests 
FOR UPDATE 
USING (auth.uid() = requester_id AND status = 'issued')
WITH CHECK (auth.uid() = requester_id AND status = 'pending_return');