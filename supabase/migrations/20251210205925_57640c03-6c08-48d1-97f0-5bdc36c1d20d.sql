-- Add foreign key relationship between device_requests.requester_id and profiles.user_id
-- First check if the column needs to reference profiles

-- Create the foreign key constraint
ALTER TABLE public.device_requests 
ADD CONSTRAINT device_requests_requester_id_profiles_fkey 
FOREIGN KEY (requester_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Also add foreign key for feedback.sender_id to profiles.user_id
ALTER TABLE public.feedback 
ADD CONSTRAINT feedback_sender_id_profiles_fkey 
FOREIGN KEY (sender_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;