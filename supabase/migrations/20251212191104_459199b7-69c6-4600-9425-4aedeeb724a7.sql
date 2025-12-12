-- Drop and recreate the trigger function with proper locking to prevent race conditions
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  ticket_num TEXT;
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := to_char(now(), 'YYYY');
  
  -- Use advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('ticket_number_lock'));
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.request_tickets
  WHERE ticket_number LIKE year_part || '-%';
  
  ticket_num := year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  NEW.ticket_number := ticket_num;
  RETURN NEW;
END;
$function$;