-- Phase 14: append-only audit trail for administrative and support actions.
-- Apply after phase13_multi_role_accounts.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  target_user_id UUID,
  operation TEXT NOT NULL,
  reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS admin_action_audit_time
  ON public.admin_action_audit (occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_action_audit_target_time
  ON public.admin_action_audit (target_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_action_audit_actor_time
  ON public.admin_action_audit (actor_id, occurred_at DESC);

ALTER TABLE public.admin_action_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_action_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.admin_action_audit TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_admin_action_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Administrative audit history is append-only.';
END;
$$;

DROP TRIGGER IF EXISTS admin_action_audit_immutable ON public.admin_action_audit;
CREATE TRIGGER admin_action_audit_immutable
  BEFORE UPDATE OR DELETE ON public.admin_action_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_action_audit_mutation();

COMMIT;
