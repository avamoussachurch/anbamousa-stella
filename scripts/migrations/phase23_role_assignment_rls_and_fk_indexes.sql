-- Phase 23: role-assignment authoritative RLS and missing FK indexes.
-- Additive only: no user, curriculum, or progress rows are deleted or rewritten.

CREATE OR REPLACE FUNCTION public.has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
  SELECT p_role IN ('student', 'parent', 'teacher', 'admin')
    AND EXISTS (
      SELECT 1
      FROM public.profile_role_assignments AS ra
      WHERE ra.user_id = (SELECT auth.uid())
        AND ra.role = p_role
        AND ra.revoked_at IS NULL
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_church_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
  SELECT public.has_role('admin');
$function$;

CREATE OR REPLACE FUNCTION public.is_church_servant_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
  SELECT public.has_role('teacher') OR public.has_role('admin');
$function$;

-- Policies that previously trusted the single legacy profiles.role value now
-- use active role assignments. This supports accounts with multiple roles.
ALTER POLICY claim_evidence_servant_policy ON public.claim_evidence
  USING (public.has_role('teacher') OR public.has_role('admin'));

ALTER POLICY evidence_maps_servant_policy ON public.evidence_maps
  USING (public.has_role('teacher') OR public.has_role('admin'));

ALTER POLICY lesson_outline_sections_servant_policy ON public.lesson_outline_sections
  USING (public.has_role('teacher') OR public.has_role('admin'));

ALTER POLICY lesson_outlines_servant_policy ON public.lesson_outlines
  USING (public.has_role('teacher') OR public.has_role('admin'));

ALTER POLICY servant_review_comments_servant_policy ON public.servant_review_comments
  USING (public.has_role('teacher') OR public.has_role('admin'));

ALTER POLICY source_conflicts_servant_policy ON public.source_conflicts
  USING (public.has_role('teacher') OR public.has_role('admin'));

ALTER POLICY class_instances_authorized_select ON public.class_instances
  USING (
    EXISTS (
      SELECT 1
      FROM public.servant_class_assignments AS sca
      JOIN public.church_years AS cy ON cy.id = sca.church_year_id
      WHERE sca.servant_id = (SELECT auth.uid())
        AND sca.class_instance_id = class_instances.id
        AND sca.is_active = true
        AND cy.is_active = true
    )
    OR public.has_role('admin')
  );

ALTER POLICY memberships_select ON public.class_memberships
  USING (
    student_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.servant_class_assignments AS sca
      JOIN public.church_years AS cy ON cy.id = sca.church_year_id
      WHERE sca.servant_id = (SELECT auth.uid())
        AND sca.class_instance_id = class_memberships.class_instance_id
        AND sca.is_active = true
        AND cy.is_active = true
    )
    OR public.has_role('admin')
  );

ALTER POLICY quiz_attempts_select_policy ON public.quiz_attempts
  USING (
    student_id = (SELECT auth.uid())::text
    OR public.has_role('admin')
    OR EXISTS (
      SELECT 1
      FROM public.class_memberships AS cm
      JOIN public.servant_class_assignments AS sca
        ON sca.class_instance_id = cm.class_instance_id
       AND sca.church_year_id = cm.church_year_id
      JOIN public.church_years AS cy ON cy.id = sca.church_year_id
      WHERE cm.student_id::text = quiz_attempts.student_id
        AND sca.servant_id = (SELECT auth.uid())
        AND sca.is_active = true
        AND cy.is_active = true
        AND cm.status = 'active'
    )
  );

ALTER POLICY servant_assignments_admin_manage ON public.servant_class_assignments
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

ALTER POLICY servant_assignments_select ON public.servant_class_assignments
  USING (
    servant_id = (SELECT auth.uid())
    OR public.has_role('admin')
  );

ALTER POLICY hymns_memberships_insert_student_pending ON public.hymns_memberships
  WITH CHECK (
    student_id = (SELECT auth.uid())::text
    AND status = 'pending'
    AND public.has_role('student')
  );

ALTER POLICY reward_requests_insert_student_pending ON public.reward_requests
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND status = 'pending'
    AND cost_points > 0
    AND public.has_role('student')
    AND (
      parent_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.user_relationships AS ur
        WHERE ur.parent_id = reward_requests.parent_id
          AND ur.child_id = reward_requests.student_id
          AND ur.relationship_type IN ('parent_child', 'guardian_student')
          AND ur.verified_at IS NOT NULL
      )
    )
  );

-- Cover foreign keys that had no leading index. These are additive indexes.
CREATE INDEX IF NOT EXISTS idx_claim_evidence_source_id_fk ON public.claim_evidence (source_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_enrolled_by_fk ON public.class_memberships (enrolled_by);
CREATE INDEX IF NOT EXISTS idx_class_memberships_instance_year_fk ON public.class_memberships (class_instance_id, church_year_id);
CREATE INDEX IF NOT EXISTS idx_evidence_maps_created_by_fk ON public.evidence_maps (created_by);
CREATE INDEX IF NOT EXISTS idx_feed_comments_author_id_fk ON public.feed_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_parent_id_fk ON public.feed_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_feed_post_attachments_owner_id_fk ON public.feed_post_attachments (owner_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_author_id_fk ON public.feed_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_user_id_fk ON public.feed_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_outlines_created_by_fk ON public.lesson_outlines (created_by);
CREATE INDEX IF NOT EXISTS idx_lesson_outlines_version_id_fk ON public.lesson_outlines (lesson_version_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id_fk ON public.lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_publication_jobs_scheduled_by_fk ON public.lesson_publication_jobs (scheduled_by);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_created_by_fk ON public.lesson_versions (created_by);
CREATE INDEX IF NOT EXISTS idx_lessons_created_by_fk ON public.lessons (created_by);
CREATE INDEX IF NOT EXISTS idx_profile_role_assignments_granted_by_fk ON public.profile_role_assignments (granted_by);
CREATE INDEX IF NOT EXISTS idx_profile_role_assignments_revoked_by_fk ON public.profile_role_assignments (revoked_by);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id_fk ON public.profiles (parent_id);
CREATE INDEX IF NOT EXISTS idx_reward_requests_parent_id_fk ON public.reward_requests (parent_id);
CREATE INDEX IF NOT EXISTS idx_reward_requests_student_id_fk ON public.reward_requests (student_id);
CREATE INDEX IF NOT EXISTS idx_role_promotion_requests_reviewed_by_fk ON public.role_promotion_requests (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_servant_assignments_instance_year_fk ON public.servant_class_assignments (class_instance_id, church_year_id);
CREATE INDEX IF NOT EXISTS idx_servant_class_assignments_assigned_by_fk ON public.servant_class_assignments (assigned_by);
CREATE INDEX IF NOT EXISTS idx_servant_review_comments_author_id_fk ON public.servant_review_comments (author_id);
CREATE INDEX IF NOT EXISTS idx_servant_review_comments_section_id_fk ON public.servant_review_comments (section_id);
CREATE INDEX IF NOT EXISTS idx_student_class_change_requests_reviewed_by_fk ON public.student_class_change_requests (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_user_relationships_child_id_fk ON public.user_relationships (child_id);
