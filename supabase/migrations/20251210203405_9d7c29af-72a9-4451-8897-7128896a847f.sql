-- Fix: Require authentication for profiles table access
-- Add a base policy that requires authentication for all SELECT operations
CREATE POLICY "Require authentication for profiles"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);

-- Fix: Require authentication for devices table access  
-- Drop the overly permissive policy and replace with authenticated-only access
DROP POLICY IF EXISTS "All authenticated can view devices" ON public.devices;

CREATE POLICY "Authenticated users can view devices"
ON public.devices
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);