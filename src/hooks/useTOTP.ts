import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOTP_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp-manage`;

interface TOTPSetupResult {
  secret: string;
  otpauth_uri: string;
  backup_codes: string[];
}

interface TOTPStatusResult {
  mfa_enabled: boolean;
  setup_at: string | null;
  verified_at: string | null;
}

async function callTOTPFunction<T>(action: string, code?: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(TOTP_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, code }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'TOTP operation failed');
  }
  
  return data;
}

export function useTOTP() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get MFA status
  const getStatus = async (): Promise<TOTPStatusResult> => {
    setLoading(true);
    setError(null);
    try {
      const result = await callTOTPFunction<TOTPStatusResult>('status');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get MFA status';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Setup MFA (generate secret and QR code)
  const setup = async (): Promise<TOTPSetupResult> => {
    setLoading(true);
    setError(null);
    try {
      const result = await callTOTPFunction<TOTPSetupResult>('setup');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to setup MFA';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify TOTP code
  const verify = async (code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await callTOTPFunction<{ valid: boolean }>('verify', code);
      return result.valid;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify code';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Enable MFA after verification
  const enable = async (code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await callTOTPFunction<{ success: boolean }>('enable', code);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable MFA';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Disable MFA
  const disable = async (code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await callTOTPFunction<{ success: boolean }>('disable', code);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable MFA';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify backup code
  const verifyBackup = async (code: string): Promise<{ valid: boolean; remaining: number }> => {
    setLoading(true);
    setError(null);
    try {
      const result = await callTOTPFunction<{ valid: boolean; remaining_codes: number }>('verify_backup', code);
      return { valid: result.valid, remaining: result.remaining_codes };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify backup code';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getStatus,
    setup,
    verify,
    enable,
    disable,
    verifyBackup,
  };
}
