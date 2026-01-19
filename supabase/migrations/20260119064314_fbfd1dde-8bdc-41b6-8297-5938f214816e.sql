-- Enable realtime for security_audit_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_audit_logs;