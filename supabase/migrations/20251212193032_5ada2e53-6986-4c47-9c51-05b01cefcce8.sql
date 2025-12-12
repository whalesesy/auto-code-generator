-- Add foreign key relationship from device_requests.requester_id to profiles.user_id
-- This enables the join query to fetch requester profile information

-- First check if constraint already exists and only add if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'device_requests_requester_id_profiles_fkey'
    AND table_name = 'device_requests'
  ) THEN
    ALTER TABLE public.device_requests 
    ADD CONSTRAINT device_requests_requester_id_profiles_fkey 
    FOREIGN KEY (requester_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;