-- Phase 27: allow students and verified parents to read only their assigned class records.

ALTER POLICY memberships_select ON public.class_memberships
USING (
  student_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_relationships AS relationship
    WHERE relationship.parent_id = (SELECT auth.uid())
      AND relationship.child_id = class_memberships.student_id
      AND relationship.relationship_type IN ('parent_child', 'guardian_student')
      AND relationship.verified_at IS NOT NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.servant_class_assignments AS assignment
    JOIN public.church_years AS year ON year.id = assignment.church_year_id
    WHERE assignment.servant_id = (SELECT auth.uid())
      AND assignment.class_instance_id = class_memberships.class_instance_id
      AND assignment.is_active = true
      AND year.is_active = true
  )
  OR public.has_role('admin')
);

ALTER POLICY class_instances_authorized_select ON public.class_instances
USING (
  EXISTS (
    SELECT 1
    FROM public.class_memberships AS membership
    JOIN public.church_years AS year ON year.id = membership.church_year_id
    WHERE membership.class_instance_id = class_instances.id
      AND membership.church_year_id = class_instances.church_year_id
      AND membership.status = 'active'
      AND year.is_active = true
      AND (
        membership.student_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.user_relationships AS relationship
          WHERE relationship.parent_id = (SELECT auth.uid())
            AND relationship.child_id = membership.student_id
            AND relationship.relationship_type IN ('parent_child', 'guardian_student')
            AND relationship.verified_at IS NOT NULL
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.servant_class_assignments AS assignment
    JOIN public.church_years AS year ON year.id = assignment.church_year_id
    WHERE assignment.servant_id = (SELECT auth.uid())
      AND assignment.class_instance_id = class_instances.id
      AND assignment.is_active = true
      AND year.is_active = true
  )
  OR public.has_role('admin')
);
