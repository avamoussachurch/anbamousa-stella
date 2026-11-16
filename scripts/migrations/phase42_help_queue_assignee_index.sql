create index if not exists student_help_requests_assigned_to_idx
  on public.student_help_requests(assigned_to)
  where assigned_to is not null;