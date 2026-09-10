alter table bug_reports add column if not exists reporter_email text;
alter table bug_reports add column if not exists conversation_id text;
alter table bug_reports add column if not exists attachment_url text;
alter table bug_reports add column if not exists notified_at timestamptz;

create index if not exists bug_reports_conv_idx on bug_reports (conversation_id);
