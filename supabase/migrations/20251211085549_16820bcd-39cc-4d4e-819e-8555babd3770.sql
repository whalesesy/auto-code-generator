-- Create signup_requests table for pending user approvals
CREATE TABLE public.signup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  requested_role app_role NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Approvers and admins can view all signup requests"
ON public.signup_requests
FOR SELECT
USING (has_role(auth.uid(), 'approver') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Approvers and admins can update signup requests"
ON public.signup_requests
FOR UPDATE
USING (has_role(auth.uid(), 'approver') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert signup requests"
ON public.signup_requests
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_signup_requests_updated_at
BEFORE UPDATE ON public.signup_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_approved column to profiles to track if user can login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;