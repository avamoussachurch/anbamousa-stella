-- Phase 25: remove overlapping permissive SELECT policies without changing access.
DROP POLICY hymns_memberships_select_staff ON public.hymns_memberships;
DROP POLICY hymns_memberships_select_student ON public.hymns_memberships;
CREATE POLICY hymns_memberships_select_authorized
ON public.hymns_memberships
FOR SELECT TO authenticated
USING (
  student_id = (SELECT auth.uid())::text
  OR public.has_role('teacher')
  OR public.has_role('admin')
);

-- The former ALL policy overlapped the dedicated SELECT policy. Split its
-- non-SELECT commands so the dedicated SELECT policy remains the single gate.
DROP POLICY servant_assignments_admin_manage ON public.servant_class_assignments;

CREATE POLICY servant_assignments_admin_insert
ON public.servant_class_assignments
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role('admin')
  AND EXISTS (
    SELECT 1
    FROM public.profile_role_assignments AS target_role
    WHERE target_role.user_id = servant_class_assignments.servant_id
      AND target_role.role IN ('teacher', 'admin')
      AND target_role.revoked_at IS NULL
  )
);

CREATE POLICY servant_assignments_admin_update
ON public.servant_class_assignments
FOR UPDATE TO authenticated
USING (public.has_role('admin'))
WITH CHECK (
  public.has_role('admin')
  AND EXISTS (
    SELECT 1
    FROM public.profile_role_assignments AS target_role
    WHERE target_role.user_id = servant_class_assignments.servant_id
      AND target_role.role IN ('teacher', 'admin')
      AND target_role.revoked_at IS NULL
  )
);

CREATE POLICY servant_assignments_admin_delete
ON public.servant_class_assignments
FOR DELETE TO authenticated
USING (public.has_role('admin'));
