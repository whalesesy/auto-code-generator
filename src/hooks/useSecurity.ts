import { supabase } from '@/integrations/supabase/client';

const SECURITY_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/security-check`;

interface LoginCheckResult {
  is_locked: boolean;
  attempts_remaining: number;
  locked_until: string | null;
}

interface RateLimitResult {
  is_limited: boolean;
  requests_remaining: number;
  reset_at: string | null;
}

interface PasswordBreachResult {
  breached: boolean;
  count: number;
}

async function callSecurityFunction<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(SECURITY_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    throw new Error('Security check failed');
  }
  
  return response.json();
}

export function useSecurity() {
  // Check if account is locked due to failed login attempts
  const checkLoginAttempts = async (email: string): Promise<LoginCheckResult> => {
    try {
      return await callSecurityFunction<LoginCheckResult>({
        action: 'check_login',
        email,
      });
    } catch {
      // Fail open but log error
      console.error('Failed to check login attempts');
      return { is_locked: false, attempts_remaining: 5, locked_until: null };
    }
  };

  // Record a failed login attempt
  const recordFailedLogin = async (email: string): Promise<LoginCheckResult> => {
    try {
      return await callSecurityFunction<LoginCheckResult>({
        action: 'record_failed',
        email,
        user_agent: navigator.userAgent,
      });
    } catch {
      console.error('Failed to record failed login');
      return { is_locked: false, attempts_remaining: 5, locked_until: null };
    }
  };

  // Clear failed login attempts on successful login
  const clearFailedLogins = async (email: string, userId?: string): Promise<void> => {
    try {
      await callSecurityFunction({
        action: 'clear_failed',
        email,
        user_id: userId,
        user_agent: navigator.userAgent,
      });
    } catch {
      console.error('Failed to clear failed logins');
    }
  };

  // Check rate limiting for an action
  const checkRateLimit = async (
    action: 'signup' | 'login' | 'password_reset',
    identifier?: string
  ): Promise<RateLimitResult> => {
    const limits = {
      signup: { max: 5, window: 3600 }, // 5 per hour
      login: { max: 10, window: 300 }, // 10 per 5 minutes
      password_reset: { max: 3, window: 3600 }, // 3 per hour
    };
    
    try {
      return await callSecurityFunction<RateLimitResult>({
        action: 'check_rate_limit',
        rate_limit_action: action,
        ip_address: identifier,
        max_requests: limits[action].max,
        window_seconds: limits[action].window,
      });
    } catch {
      console.error('Failed to check rate limit');
      return { is_limited: false, requests_remaining: 10, reset_at: null };
    }
  };

  // Check if password has been breached
  const checkPasswordBreach = async (password: string): Promise<PasswordBreachResult> => {
    try {
      return await callSecurityFunction<PasswordBreachResult>({
        action: 'check_password_breach',
        password,
      });
    } catch {
      console.error('Failed to check password breach');
      return { breached: false, count: 0 };
    }
  };

  // Log a security event
  const logSecurityEvent = async (
    eventType: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await callSecurityFunction({
        action: 'log_event',
        event_type: eventType,
        user_id: user?.id,
        email: user?.email,
        user_agent: navigator.userAgent,
        metadata,
      });
    } catch {
      console.error('Failed to log security event');
    }
  };

  return {
    checkLoginAttempts,
    recordFailedLogin,
    clearFailedLogins,
    checkRateLimit,
    checkPasswordBreach,
    logSecurityEvent,
  };
}
