-- Shift Audit Logs table
-- Tracks all shift opening, closing, resumption, deletion, and state transitions
-- for both Park (Ticket Sales) and Restaurant POS shifts.

CREATE TABLE IF NOT EXISTS public.shift_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id text NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('park', 'restaurant')),
  shift_number text NOT NULL,
  auto_shift_number text,
  action text NOT NULL, -- 'OPEN', 'CLOSE', 'RESUME', 'ACTIVATE', 'UPDATE', 'DELETE', 'AUTO_CREATE', 'HEALTH_CHECK', 'FILTER_ANOMALY', 'VISIBILITY_CHANGE'
  status_before text,
  status_after text,
  cashier_name text,
  cashier_id text,
  performed_by text,
  user_id uuid,
  user_email text,
  details text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_audit_logs_shift_id ON public.shift_audit_logs(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_audit_logs_shift_type ON public.shift_audit_logs(shift_type);
CREATE INDEX IF NOT EXISTS idx_shift_audit_logs_action ON public.shift_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_shift_audit_logs_created_at ON public.shift_audit_logs(created_at DESC);

ALTER TABLE public.shift_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated roles to read shift audit logs
DROP POLICY IF EXISTS "anon and authenticated read shift_audit_logs" ON public.shift_audit_logs;
CREATE POLICY "anon and authenticated read shift_audit_logs"
  ON public.shift_audit_logs FOR SELECT TO anon, authenticated USING (true);

-- Allow anon and authenticated roles to insert shift audit logs
DROP POLICY IF EXISTS "anon and authenticated insert shift_audit_logs" ON public.shift_audit_logs;
CREATE POLICY "anon and authenticated insert shift_audit_logs"
  ON public.shift_audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
