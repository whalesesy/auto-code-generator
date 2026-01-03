-- Create trigger function for automatic stock movements on device issue/return
CREATE OR REPLACE FUNCTION public.handle_device_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When device is issued, create a stock out movement
  IF NEW.status = 'issued' AND (OLD.status IS NULL OR OLD.status != 'issued') THEN
    IF NEW.device_id IS NOT NULL THEN
      INSERT INTO public.stock_movements (device_id, quantity, movement_type, performed_by, reason)
      VALUES (
        NEW.device_id,
        NEW.quantity,
        'out',
        COALESCE(NEW.approver_id, auth.uid()),
        'Device issued - Request ID: ' || NEW.id::text
      );
    END IF;
  END IF;

  -- When device is returned, create a stock in movement
  IF NEW.status = 'returned' AND OLD.status = 'pending_return' THEN
    IF NEW.device_id IS NOT NULL THEN
      INSERT INTO public.stock_movements (device_id, quantity, movement_type, performed_by, reason)
      VALUES (
        NEW.device_id,
        NEW.quantity,
        'in',
        auth.uid(),
        'Device returned - Request ID: ' || NEW.id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on device_requests table
DROP TRIGGER IF EXISTS trigger_device_stock_movement ON public.device_requests;
CREATE TRIGGER trigger_device_stock_movement
  AFTER UPDATE ON public.device_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_device_stock_movement();