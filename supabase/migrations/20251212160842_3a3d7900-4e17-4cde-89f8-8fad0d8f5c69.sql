-- Fix 1: Update profiles RLS policy to prevent unapproved users from viewing all profiles
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;

-- Create a more restrictive policy: users can only view profiles if they are approved
-- or if they're viewing their own profile
CREATE POLICY "Approved users can view profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR
  (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_approved = true
  ))
);

-- Fix 2: Update signup_requests RLS policy to prevent self-approval at database level
DROP POLICY IF EXISTS "Approvers and admins can update signup requests" ON public.signup_requests;

-- Create a security definer function to get user email safely
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id
$$;

-- Create new policy that prevents self-approval
CREATE POLICY "Approvers and admins can update signup requests (no self)" ON public.signup_requests
FOR UPDATE USING (
  (has_role(auth.uid(), 'approver') OR has_role(auth.uid(), 'admin'))
  AND email != public.get_user_email(auth.uid())
);