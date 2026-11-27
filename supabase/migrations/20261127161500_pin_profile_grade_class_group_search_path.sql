-- This immutable helper only uses pg_catalog built-ins. Pin its search path to
-- prevent caller-controlled schemas from influencing function name resolution.
alter function public.profile_grade_class_group(text) set search_path = pg_catalog;
