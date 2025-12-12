-- Add pending_return status to request_status enum
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'pending_return';