-- Create security audit logs table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'login_success', 'login_failed', 'password_reset', 'signup', 'logout', 'mfa_setup', 'mfa_verified', 'account_locked'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for querying by user and event type
CREATE INDEX idx_security_audit_user ON public.security_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_security_audit_event ON public.security_audit_logs(event_type, created_at DESC);
CREATE INDEX idx_security_audit_ip ON public.security_audit_logs(ip_address, created_at DESC);

-- Create failed login attempts tracking table
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_until TIMESTAMP WITH TIME ZONE,
  UNIQUE(email)
);

CREATE INDEX idx_failed_login_email ON public.failed_login_attempts(email);
CREATE INDEX idx_failed_login_ip ON public.failed_login_attempts(ip_address);

-- Create TOTP secrets table for MFA
CREATE TABLE IF NOT EXISTS public.user_totp_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  encrypted_secret TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[], -- Encrypted backup codes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or email
  action_type TEXT NOT NULL, -- 'signup', 'login', 'password_reset'
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(identifier, action_type)
);

CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier, action_type);

-- Enable RLS on all security tables
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_totp_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Security audit logs policies - Only admins can view, system can insert
CREATE POLICY "Admins can view security audit logs"
ON public.security_audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Failed login attempts - System managed, no direct user access
CREATE POLICY "System manages failed login attempts"
ON public.failed_login_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- TOTP secrets - Users can only see/manage their own
CREATE POLICY "Users can view their own TOTP settings"
ON public.user_totp_secrets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own TOTP settings"
ON public.user_totp_secrets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own TOTP settings"
ON public.user_totp_secrets
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own TOTP settings"
ON public.user_totp_secrets
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Rate limits - System managed
CREATE POLICY "System manages rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to log security events (called from edge functions with service role)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.security_audit_logs (event_type, user_id, ip_address, user_agent, email, metadata)
  VALUES (p_event_type, p_user_id, p_ip_address, p_user_agent, p_email, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to check and update failed login attempts
CREATE OR REPLACE FUNCTION public.check_login_attempts(p_email TEXT, p_ip_address TEXT DEFAULT NULL)
RETURNS TABLE(is_locked BOOLEAN, attempts_remaining INTEGER, locked_until TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := '15 minutes';
  current_record RECORD;
BEGIN
  SELECT * INTO current_record
  FROM public.failed_login_attempts
  WHERE email = p_email;
  
  IF current_record IS NULL THEN
    RETURN QUERY SELECT false, max_attempts, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  -- Check if currently locked
  IF current_record.locked_until IS NOT NULL AND current_record.locked_until > now() THEN
    RETURN QUERY SELECT true, 0, current_record.locked_until;
    RETURN;
  END IF;
  
  -- Reset if lock expired
  IF current_record.locked_until IS NOT NULL AND current_record.locked_until <= now() THEN
    DELETE FROM public.failed_login_attempts WHERE email = p_email;
    RETURN QUERY SELECT false, max_attempts, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT false, max_attempts - current_record.attempt_count, current_record.locked_until;
END;
$$;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email TEXT, p_ip_address TEXT DEFAULT NULL)
RETURNS TABLE(is_now_locked BOOLEAN, attempts_remaining INTEGER, locked_until TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := '15 minutes';
  current_count INTEGER;
  lock_time TIMESTAMP WITH TIME ZONE;
BEGIN
  INSERT INTO public.failed_login_attempts (email, ip_address, attempt_count, first_attempt_at, last_attempt_at)
  VALUES (p_email, p_ip_address, 1, now(), now())
  ON CONFLICT (email) DO UPDATE
  SET attempt_count = failed_login_attempts.attempt_count + 1,
      last_attempt_at = now(),
      ip_address = COALESCE(p_ip_address, failed_login_attempts.ip_address)
  RETURNING attempt_count INTO current_count;
  
  -- Lock account if max attempts reached
  IF current_count >= max_attempts THEN
    lock_time := now() + lockout_duration;
    UPDATE public.failed_login_attempts
    SET locked_until = lock_time
    WHERE email = p_email;
    
    -- Log the lockout event
    PERFORM public.log_security_event('account_locked', NULL, p_ip_address, NULL, p_email, 
      jsonb_build_object('attempts', current_count, 'locked_until', lock_time));
    
    RETURN QUERY SELECT true, 0, lock_time;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT false, max_attempts - current_count, NULL::TIMESTAMP WITH TIME ZONE;
END;
$$;

-- Function to clear failed login attempts on successful login
CREATE OR REPLACE FUNCTION public.clear_failed_logins(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.failed_login_attempts WHERE email = p_email;
END;
$$;

-- Function to check rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_action_type TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE(is_limited BOOLEAN, requests_remaining INTEGER, reset_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_record RECORD;
  window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start_time := now() - (p_window_seconds || ' seconds')::INTERVAL;
  
  SELECT * INTO current_record
  FROM public.rate_limits
  WHERE identifier = p_identifier AND action_type = p_action_type;
  
  -- No record or expired window
  IF current_record IS NULL OR current_record.window_start < window_start_time THEN
    -- Create or reset
    INSERT INTO public.rate_limits (identifier, action_type, request_count, window_start)
    VALUES (p_identifier, p_action_type, 1, now())
    ON CONFLICT (identifier, action_type) DO UPDATE
    SET request_count = 1, window_start = now();
    
    RETURN QUERY SELECT false, p_max_requests - 1, now() + (p_window_seconds || ' seconds')::INTERVAL;
    RETURN;
  END IF;
  
  -- Check if rate limited
  IF current_record.request_count >= p_max_requests THEN
    RETURN QUERY SELECT true, 0, current_record.window_start + (p_window_seconds || ' seconds')::INTERVAL;
    RETURN;
  END IF;
  
  -- Increment count
  UPDATE public.rate_limits
  SET request_count = request_count + 1
  WHERE identifier = p_identifier AND action_type = p_action_type;
  
  RETURN QUERY SELECT false, p_max_requests - current_record.request_count - 1, 
    current_record.window_start + (p_window_seconds || ' seconds')::INTERVAL;
END;
$$;