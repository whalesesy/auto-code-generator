import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple base32 encoding/decoding
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Uint8Array): string {
  let result = "";
  let bits = 0;
  let value = 0;
  
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >> bits) & 0x1f];
    }
  }
  
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  
  return result;
}

function base32Decode(input: string): Uint8Array {
  const cleanInput = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  const output: number[] = [];
  let bits = 0;
  let value = 0;
  
  for (const char of cleanInput) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    
    value = (value << 5) | index;
    bits += 5;
    
    if (bits >= 8) {
      bits -= 8;
      output.push((value >> bits) & 0xff);
    }
  }
  
  return new Uint8Array(output);
}

// AES-GCM encryption for TOTP secrets
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyData = Deno.env.get("TOTP_ENCRYPTION_KEY");
  if (!keyData) {
    throw new Error("TOTP_ENCRYPTION_KEY not configured");
  }
  
  // Decode base64 key (32 bytes for AES-256)
  const keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText
  );
  
  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptSecret(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch {
    // Fallback for unencrypted legacy secrets (base32 format)
    // Check if it looks like a base32 secret
    if (/^[A-Z2-7]+$/.test(encryptedData)) {
      console.log("Legacy unencrypted secret detected, will be encrypted on next update");
      return encryptedData;
    }
    throw new Error("Failed to decrypt secret");
  }
}

// Encrypt backup codes array
async function encryptBackupCodes(codes: string[]): Promise<string> {
  return await encryptSecret(JSON.stringify(codes));
}

async function decryptBackupCodes(encryptedCodes: string): Promise<string[]> {
  try {
    const decrypted = await decryptSecret(encryptedCodes);
    return JSON.parse(decrypted);
  } catch {
    // Fallback for legacy unencrypted backup codes stored as array
    return [];
  }
}

// Generate TOTP code
async function generateTOTP(secret: string, timeStep = 30): Promise<string> {
  const key = base32Decode(secret);
  const time = Math.floor(Date.now() / 1000 / timeStep);
  
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setBigUint64(0, BigInt(time), false);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, timeBuffer);
  const hmac = new Uint8Array(signature);
  
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, "0");
}

// Verify TOTP code with time window tolerance
async function verifyTOTP(secret: string, code: string, window = 1): Promise<boolean> {
  for (let i = -window; i <= window; i++) {
    const timeStep = 30;
    const time = Math.floor(Date.now() / 1000 / timeStep) + i;
    
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setBigUint64(0, BigInt(time), false);
    
    const key = base32Decode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key.buffer as ArrayBuffer,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, timeBuffer);
    const hmac = new Uint8Array(signature);
    
    const offset = hmac[hmac.length - 1] & 0x0f;
    const codeNum = ((hmac[offset] & 0x7f) << 24) |
                    ((hmac[offset + 1] & 0xff) << 16) |
                    ((hmac[offset + 2] & 0xff) << 8) |
                    (hmac[offset + 3] & 0xff);
    
    const expectedCode = (codeNum % 1000000).toString().padStart(6, "0");
    if (expectedCode === code) return true;
  }
  
  return false;
}

// Generate random secret
function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

// Generate backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    codes.push(code.substring(0, 8));
  }
  return codes;
}

interface TOTPRequest {
  action: "setup" | "verify" | "enable" | "disable" | "status" | "verify_backup";
  code?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Check if encryption key is configured
    const encryptionKey = Deno.env.get("TOTP_ENCRYPTION_KEY");
    if (!encryptionKey) {
      console.error("TOTP_ENCRYPTION_KEY not configured");
      return new Response(JSON.stringify({ error: "MFA service not properly configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body: TOTPRequest = await req.json();
    const { action, code } = body;

    switch (action) {
      case "status": {
        const { data } = await supabaseAdmin
          .from("user_totp_secrets")
          .select("is_enabled, created_at, verified_at")
          .eq("user_id", user.id)
          .single();
        
        return new Response(JSON.stringify({
          mfa_enabled: data?.is_enabled || false,
          setup_at: data?.created_at || null,
          verified_at: data?.verified_at || null
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "setup": {
        // Generate new secret
        const secret = generateSecret();
        const backupCodes = generateBackupCodes();
        
        // Encrypt the secret and backup codes before storing
        const encryptedSecret = await encryptSecret(secret);
        const encryptedBackupCodes = await encryptBackupCodes(backupCodes);
        
        // Upsert the encrypted secret (not enabled until verified)
        await supabaseAdmin
          .from("user_totp_secrets")
          .upsert({
            user_id: user.id,
            encrypted_secret: encryptedSecret,
            backup_codes: [encryptedBackupCodes], // Store as array with single encrypted string
            is_enabled: false,
            created_at: new Date().toISOString()
          }, { onConflict: "user_id" });
        
        // Generate TOTP URI for QR code (using plaintext secret for the client)
        const issuer = "DeviceHub";
        const accountName = user.email || user.id;
        const otpAuthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
        
        return new Response(JSON.stringify({
          secret,
          otpauth_uri: otpAuthUri,
          backup_codes: backupCodes
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "verify": {
        if (!code || code.length !== 6) {
          return new Response(JSON.stringify({ error: "Invalid code format" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        const { data: totpData } = await supabaseAdmin
          .from("user_totp_secrets")
          .select("encrypted_secret, is_enabled")
          .eq("user_id", user.id)
          .single();
        
        if (!totpData) {
          return new Response(JSON.stringify({ error: "MFA not set up" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        // Decrypt the secret before verification
        const plainSecret = await decryptSecret(totpData.encrypted_secret);
        const isValid = await verifyTOTP(plainSecret, code);
        
        return new Response(JSON.stringify({ valid: isValid }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "enable": {
        if (!code || code.length !== 6) {
          return new Response(JSON.stringify({ error: "Invalid code format" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        const { data: totpData } = await supabaseAdmin
          .from("user_totp_secrets")
          .select("encrypted_secret")
          .eq("user_id", user.id)
          .single();
        
        if (!totpData) {
          return new Response(JSON.stringify({ error: "MFA not set up. Please run setup first." }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        // Decrypt the secret before verification
        const plainSecret = await decryptSecret(totpData.encrypted_secret);
        const isValid = await verifyTOTP(plainSecret, code);
        
        if (!isValid) {
          return new Response(JSON.stringify({ error: "Invalid verification code" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        await supabaseAdmin
          .from("user_totp_secrets")
          .update({ 
            is_enabled: true,
            verified_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
        
        // Log MFA enabled event
        await supabaseAdmin.rpc("log_security_event", {
          p_event_type: "mfa_enabled",
          p_user_id: user.id,
          p_email: user.email
        });
        
        return new Response(JSON.stringify({ success: true, message: "MFA enabled successfully" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "disable": {
        if (!code || code.length !== 6) {
          return new Response(JSON.stringify({ error: "Invalid code format" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        const { data: totpData } = await supabaseAdmin
          .from("user_totp_secrets")
          .select("encrypted_secret")
          .eq("user_id", user.id)
          .single();
        
        if (!totpData) {
          return new Response(JSON.stringify({ error: "MFA not set up" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        // Decrypt the secret before verification
        const plainSecret = await decryptSecret(totpData.encrypted_secret);
        const isValid = await verifyTOTP(plainSecret, code);
        
        if (!isValid) {
          return new Response(JSON.stringify({ error: "Invalid verification code" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        await supabaseAdmin
          .from("user_totp_secrets")
          .delete()
          .eq("user_id", user.id);
        
        // Log MFA disabled event
        await supabaseAdmin.rpc("log_security_event", {
          p_event_type: "mfa_disabled",
          p_user_id: user.id,
          p_email: user.email
        });
        
        return new Response(JSON.stringify({ success: true, message: "MFA disabled successfully" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "verify_backup": {
        if (!code || code.length !== 8) {
          return new Response(JSON.stringify({ error: "Invalid backup code format" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        const { data: totpData } = await supabaseAdmin
          .from("user_totp_secrets")
          .select("backup_codes")
          .eq("user_id", user.id)
          .single();
        
        if (!totpData || !totpData.backup_codes || totpData.backup_codes.length === 0) {
          return new Response(JSON.stringify({ error: "No backup codes found" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        // Decrypt backup codes (stored as single encrypted string in array)
        let backupCodes: string[];
        try {
          backupCodes = await decryptBackupCodes(totpData.backup_codes[0]);
        } catch {
          // Fallback for legacy unencrypted backup codes
          backupCodes = totpData.backup_codes;
        }
        
        const upperCode = code.toUpperCase();
        const codeIndex = backupCodes.indexOf(upperCode);
        
        if (codeIndex === -1) {
          return new Response(JSON.stringify({ valid: false, error: "Invalid backup code" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        // Remove used backup code and re-encrypt
        const newBackupCodes = backupCodes.filter((_: string, i: number) => i !== codeIndex);
        const encryptedNewCodes = await encryptBackupCodes(newBackupCodes);
        
        await supabaseAdmin
          .from("user_totp_secrets")
          .update({ backup_codes: [encryptedNewCodes] })
          .eq("user_id", user.id);
        
        return new Response(JSON.stringify({ 
          valid: true, 
          remaining_codes: newBackupCodes.length 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  } catch (error: unknown) {
    console.error("TOTP error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
