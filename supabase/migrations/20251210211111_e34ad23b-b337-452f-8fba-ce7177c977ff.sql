-- Add expected_return_date column to device_requests for tracking overdue returns
ALTER TABLE public.device_requests 
ADD COLUMN IF NOT EXISTS expected_return_date date,
ADD COLUMN IF NOT EXISTS pickup_location text,
ADD COLUMN IF NOT EXISTS pickup_time timestamp with time zone;

-- Create a function to calculate expected return date based on duration
CREATE OR REPLACE FUNCTION public.calculate_expected_return_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.issued_at IS NOT NULL AND NEW.expected_return_date IS NULL THEN
    CASE NEW.duration
      WHEN '1_day' THEN NEW.expected_return_date := (NEW.issued_at + interval '1 day')::date;
      WHEN '3_days' THEN NEW.expected_return_date := (NEW.issued_at + interval '3 days')::date;
      WHEN '1_week' THEN NEW.expected_return_date := (NEW.issued_at + interval '1 week')::date;
      WHEN '2_weeks' THEN NEW.expected_return_date := (NEW.issued_at + interval '2 weeks')::date;
      WHEN '1_month' THEN NEW.expected_return_date := (NEW.issued_at + interval '1 month')::date;
      WHEN '3_months' THEN NEW.expected_return_date := (NEW.issued_at + interval '3 months')::date;
      WHEN '6_months' THEN NEW.expected_return_date := (NEW.issued_at + interval '6 months')::date;
      WHEN '1_year' THEN NEW.expected_return_date := (NEW.issued_at + interval '1 year')::date;
      ELSE NEW.expected_return_date := (NEW.issued_at + interval '1 week')::date;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic expected return date calculation
DROP TRIGGER IF EXISTS calculate_expected_return ON public.device_requests;
CREATE TRIGGER calculate_expected_return
BEFORE INSERT OR UPDATE ON public.device_requests
FOR EACH ROW
EXECUTE FUNCTION public.calculate_expected_return_date();