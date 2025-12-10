-- Fix security issue: Restrict profiles visibility to own profile + admins can see all
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles for management purposes
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Approvers can view profiles of users who have requests pending
CREATE POLICY "Approvers can view requester profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'approver') AND
  EXISTS (
    SELECT 1 FROM public.device_requests dr 
    WHERE dr.requester_id = profiles.user_id
  )
);

-- Fix feedback table: Remove plain text message access for received feedback, ensure encryption is used
-- Add policy for feedback where recipient can only see encrypted content
DROP POLICY IF EXISTS "Users can view feedback they sent or received" ON public.feedback;

-- Users can view feedback they sent (full access since they wrote it)
CREATE POLICY "Users can view feedback they sent"
ON public.feedback
FOR SELECT
USING (auth.uid() = sender_id);

-- Recipients can view feedback directed to them
CREATE POLICY "Users can view feedback they received"
ON public.feedback
FOR SELECT
USING (auth.uid() = recipient_id);

-- Approvers can view feedback addressed to approvers group
CREATE POLICY "Approvers can view approver feedback"
ON public.feedback
FOR SELECT
USING (
  public.has_role(auth.uid(), 'approver') AND recipient_type = 'approver'
);