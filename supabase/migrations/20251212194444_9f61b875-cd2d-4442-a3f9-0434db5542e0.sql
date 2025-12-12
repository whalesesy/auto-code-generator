-- Drop the problematic recursive RLS policy on profiles
DROP POLICY IF EXISTS "Approved users can view profiles" ON public.profiles;

-- Create a simpler, non-recursive policy for viewing profiles
-- Authenticated users can view all profiles (since profile info is needed for approvals, notifications, etc.)
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);