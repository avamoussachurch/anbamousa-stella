-- Phase 13: normalized multi-role accounts and audited role changes.
-- Apply after phase4_security_hardening.sql. This migration is additive;
-- profiles.role remains a legacy primary-role projection.
BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'parent', 'teacher', 'admin')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  grant_source TEXT NOT NULL CHECK (
    grant_source IN ('registration', 'backfill', 'admin', 'role_request', 'trusted_server')
  ),
  reason TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoke_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_role_assignments_one_active_role
  ON public.profile_role_assignments (user_id, role)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS profile_role_assignments_user_active
  ON public.profile_role_assignments (user_id, role)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.role_promotion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('student', 'parent', 'teacher')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT,
  CONSTRAINT role_promotion_requests_review_state_check CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS role_promotion_requests_one_pending_per_role
  ON public.role_promotion_requests (requester_id, requested_role)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS role_promotion_requests_queue
  ON public.role_promotion_requests (status, requested_at);

CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_type TEXT NOT NULL CHECK (
    actor_type IN ('user', 'service_role', 'migration', 'registration')
  ),
  target_user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN ('role_granted', 'role_revoked', 'request_approved', 'request_rejected')
  ),
  previous_role TEXT CHECK (previous_role IN ('student', 'parent', 'teacher', 'admin')),
  new_role TEXT CHECK (new_role IN ('student', 'parent', 'teacher', 'admin')),
  requested_role TEXT CHECK (requested_role IN ('student', 'parent', 'teacher', 'admin')),
  request_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS role_change_audit_target_time
  ON public.role_change_audit (target_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS role_change_audit_actor_time
  ON public.role_change_audit (actor_id, occurred_at DESC);

ALTER TABLE public.profile_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_promotion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT p_role IN ('student', 'parent', 'teacher', 'admin')
    AND EXISTS (
      SELECT 1
      FROM public.profile_role_assignments AS ra
      WHERE ra.user_id = auth.uid()
        AND ra.role = p_role
        AND ra.revoked_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.grant_profile_role_internal(
  p_user_id UUID,
  p_role TEXT,
  p_actor_id UUID,
  p_actor_type TEXT,
  p_grant_source TEXT,
  p_reason TEXT,
  p_request_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  IF p_role IS NULL OR p_role NOT IN ('student', 'parent', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Invalid role.' USING ERRCODE = '22023';
  END IF;
  IF p_actor_type NOT IN ('user', 'service_role', 'migration', 'registration') THEN
    RAISE EXCEPTION 'Invalid role-change actor type.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = p_user_id) THEN
    RAISE EXCEPTION 'Profile not found.' USING ERRCODE = 'P0002';
  END IF;

  IF p_role = 'admin' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(431927, 13);
  END IF;

  INSERT INTO public.profile_role_assignments (
    user_id, role, granted_by, grant_source, reason
  )
  VALUES (p_user_id, p_role, p_actor_id, p_grant_source, p_reason)
  ON CONFLICT (user_id, role) WHERE revoked_at IS NULL DO NOTHING
  RETURNING id INTO v_assignment_id;

  IF v_assignment_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.role_change_audit (
    actor_id, actor_type, target_user_id, action, previous_role,
    new_role, requested_role, request_id, reason
  )
  VALUES (
    p_actor_id, p_actor_type, p_user_id, 'role_granted', NULL,
    p_role, p_role, p_request_id, p_reason
  );
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_role_assignment_for_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
BEGIN
  PERFORM public.grant_profile_role_internal(
    NEW.id, NEW.role, NULL, 'registration', 'registration',
    'Default role assigned when the profile was created.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_role_assignment_for_new_profile ON public.profiles;
CREATE TRIGGER create_role_assignment_for_new_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_role_assignment_for_new_profile();

CREATE OR REPLACE FUNCTION public.guard_last_admin_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_admin_count BIGINT;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(431927, 13);
  IF EXISTS (
    SELECT 1
    FROM public.profile_role_assignments AS ra
    WHERE ra.user_id = OLD.id
      AND ra.role = 'admin'
      AND ra.revoked_at IS NULL
  ) THEN
    SELECT pg_catalog.count(DISTINCT ra.user_id) INTO v_admin_count
    FROM public.profile_role_assignments AS ra
    WHERE ra.role = 'admin'
      AND ra.revoked_at IS NULL;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'The last active admin account cannot be deleted.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_last_admin_profile_delete ON public.profiles;
CREATE TRIGGER guard_last_admin_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_last_admin_profile_delete();

-- Backfill only missing assignments; preserve every existing profile role.
INSERT INTO public.profile_role_assignments (
  user_id, role, grant_source, reason
)
SELECT p.id, p.role, 'backfill', 'Backfilled from the existing profiles.role value.'
FROM public.profiles AS p
WHERE p.role IN ('student', 'parent', 'teacher', 'admin')
  AND NOT EXISTS (
    SELECT 1
    FROM public.profile_role_assignments AS ra
    WHERE ra.user_id = p.id
      AND ra.role = p.role
      AND ra.revoked_at IS NULL
  )
ON CONFLICT (user_id, role) WHERE revoked_at IS NULL DO NOTHING;

INSERT INTO public.role_change_audit (
  actor_type, target_user_id, action, new_role, requested_role, reason
)
SELECT 'migration', p.id, 'role_granted', p.role, p.role,
       'Initial role backfill from profiles.role.'
FROM public.profiles AS p
WHERE p.role IN ('student', 'parent', 'teacher', 'admin')
  AND EXISTS (
    SELECT 1
    FROM public.profile_role_assignments AS ra
    WHERE ra.user_id = p.id
      AND ra.role = p.role
      AND ra.grant_source = 'backfill'
      AND ra.revoked_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.role_change_audit AS audit
    WHERE audit.target_user_id = p.id
      AND audit.action = 'role_granted'
      AND audit.new_role = p.role
      AND audit.reason = 'Initial role backfill from profiles.role.'
  );

CREATE OR REPLACE FUNCTION public.request_role_promotion(
  p_requested_role TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_request_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'An authenticated user is required.' USING ERRCODE = '42501';
  END IF;
  IF p_requested_role IS NULL OR p_requested_role NOT IN ('student', 'parent', 'teacher') THEN
    RAISE EXCEPTION 'Only student, parent, or teacher roles may be requested.'
      USING ERRCODE = '22023';
  END IF;
  IF public.has_role(p_requested_role) THEN
    RAISE EXCEPTION 'The requested role is already active.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.role_promotion_requests (requester_id, requested_role, reason)
  VALUES (v_user_id, p_requested_role, NULLIF(pg_catalog.btrim(p_reason), ''))
  RETURNING id INTO v_request_id;
  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_profile_role(
  p_target_user_id UUID,
  p_role TEXT,
  p_action TEXT,
  p_actor_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_assignment_id UUID;
  v_admin_count BIGINT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Role assignment changes are restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('grant', 'revoke')
     OR p_role IS NULL OR p_role NOT IN ('student', 'parent', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Invalid role action or role.' USING ERRCODE = '22023';
  END IF;
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profile_role_assignments AS ra
    WHERE ra.user_id = p_actor_id
      AND ra.role = 'admin'
      AND ra.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The acting account must have an active admin role.'
      USING ERRCODE = '42501';
  END IF;
  IF p_actor_id = p_target_user_id THEN
    RAISE EXCEPTION 'Administrators cannot change their own role assignments.'
      USING ERRCODE = '42501';
  END IF;

  IF p_action = 'grant' THEN
    RETURN public.grant_profile_role_internal(
      p_target_user_id, p_role, p_actor_id, 'user', 'admin',
      p_reason
    );
  END IF;

  IF p_role = 'admin' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(431927, 13);
    SELECT pg_catalog.count(*) INTO v_admin_count
    FROM public.profile_role_assignments AS ra
    WHERE ra.role = 'admin' AND ra.revoked_at IS NULL;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'The last active admin role cannot be revoked.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.profile_role_assignments AS ra
  SET revoked_at = pg_catalog.now(),
      revoked_by = p_actor_id,
      revoke_reason = p_reason
  WHERE ra.user_id = p_target_user_id
    AND ra.role = p_role
    AND ra.revoked_at IS NULL
  RETURNING ra.id INTO v_assignment_id;

  IF v_assignment_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.role_change_audit (
    actor_id, actor_type, target_user_id, action, previous_role,
    new_role, requested_role, reason
  )
  VALUES (
    p_actor_id, 'user', p_target_user_id, 'role_revoked', p_role,
    NULL, p_role, p_reason
  );
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_role_promotion_request(
  p_request_id UUID,
  p_actor_id UUID,
  p_approve BOOLEAN,
  p_review_reason TEXT DEFAULT NULL
)
RETURNS public.role_promotion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_request public.role_promotion_requests;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Role request review is restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;
  IF p_approve IS NULL THEN
    RAISE EXCEPTION 'An explicit approval or rejection decision is required.'
      USING ERRCODE = '22023';
  END IF;
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profile_role_assignments AS ra
    WHERE ra.user_id = p_actor_id
      AND ra.role = 'admin'
      AND ra.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The reviewing account must have an active admin role.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request
  FROM public.role_promotion_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role request not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending role requests can be reviewed.'
      USING ERRCODE = '23514';
  END IF;
  IF v_request.requester_id = p_actor_id THEN
    RAISE EXCEPTION 'Administrators cannot approve or reject their own requests.'
      USING ERRCODE = '42501';
  END IF;

  IF p_approve THEN
    PERFORM public.grant_profile_role_internal(
      v_request.requester_id, v_request.requested_role, p_actor_id,
      'user', 'role_request', p_review_reason, v_request.id
    );
  END IF;

  UPDATE public.role_promotion_requests AS r
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reviewed_by = p_actor_id,
      reviewed_at = pg_catalog.now(),
      review_reason = NULLIF(pg_catalog.btrim(p_review_reason), '')
  WHERE r.id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.role_change_audit (
    actor_id, actor_type, target_user_id, action, requested_role,
    request_id, reason
  )
  VALUES (
    p_actor_id, 'user', v_request.requester_id,
    CASE WHEN p_approve THEN 'request_approved' ELSE 'request_rejected' END,
    v_request.requested_role, v_request.id, p_review_reason
  );
  RETURN v_request;
END;
$$;

-- Preserve the existing trusted-server RPC signature, but make it additive.
CREATE OR REPLACE FUNCTION public.provision_profile_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Role provisioning is restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;
  PERFORM public.grant_profile_role_internal(
    p_user_id, p_role, NULL, 'service_role', 'trusted_server',
    'Granted through the legacy trusted-server provisioning RPC.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_role_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Role-change audit history is append-only.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS role_change_audit_immutable ON public.role_change_audit;
CREATE TRIGGER role_change_audit_immutable
  BEFORE UPDATE OR DELETE ON public.role_change_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_role_audit_mutation();

DROP POLICY IF EXISTS profile_role_assignments_read_authorized ON public.profile_role_assignments;
CREATE POLICY profile_role_assignments_read_authorized
  ON public.profile_role_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role('admin'));

DROP POLICY IF EXISTS role_promotion_requests_read_authorized ON public.role_promotion_requests;
CREATE POLICY role_promotion_requests_read_authorized
  ON public.role_promotion_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.has_role('admin'));

DROP POLICY IF EXISTS role_change_audit_read_admin ON public.role_change_audit;
CREATE POLICY role_change_audit_read_admin
  ON public.role_change_audit FOR SELECT TO authenticated
  USING (public.has_role('admin'));

REVOKE ALL ON TABLE public.profile_role_assignments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.role_promotion_requests FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.role_change_audit FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.profile_role_assignments TO authenticated;
GRANT SELECT ON TABLE public.role_promotion_requests TO authenticated;
GRANT SELECT ON TABLE public.role_change_audit TO authenticated;
GRANT SELECT ON TABLE public.profile_role_assignments TO service_role;
GRANT SELECT ON TABLE public.role_promotion_requests TO service_role;
GRANT SELECT ON TABLE public.role_change_audit TO service_role;

REVOKE ALL ON FUNCTION public.has_role(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_profile_role_internal(UUID, TEXT, UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_role_assignment_for_new_profile() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.guard_last_admin_profile_delete() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.request_role_promotion(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manage_profile_role(UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_role_promotion_request(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_profile_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_role_audit_mutation() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_role_promotion(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manage_profile_role(UUID, TEXT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_role_promotion_request(UUID, UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_profile_role(UUID, TEXT) TO service_role;

COMMIT;
