-- Add database constraints for data quality on signup_requests table
-- This adds defense-in-depth against spam attacks by validating data at the database level

-- Check email format (standard email regex)
ALTER TABLE public.signup_requests 
  ADD CONSTRAINT check_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Check full_name has minimum 2 characters and max 100
ALTER TABLE public.signup_requests 
  ADD CONSTRAINT check_full_name_length 
  CHECK (length(trim(full_name)) >= 2 AND length(full_name) <= 100);

-- Check phone format (Kenyan format or NULL)
ALTER TABLE public.signup_requests 
  ADD CONSTRAINT check_phone_format 
  CHECK (phone IS NULL OR phone ~* '^\+?[0-9]{10,15}$');