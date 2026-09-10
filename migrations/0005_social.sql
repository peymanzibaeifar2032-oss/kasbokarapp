alter table reviews add column if not exists owner_reply text;
alter table reviews add column if not exists owner_reply_at timestamptz;
