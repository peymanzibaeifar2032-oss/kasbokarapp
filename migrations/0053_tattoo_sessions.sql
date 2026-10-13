alter table tattoo_requests add column if not exists session_parent_id text;
alter table tattoo_requests add column if not exists session_index int;
alter table tattoo_requests add column if not exists session_status text not null default 'planned';

create index if not exists tattoo_requests_session_parent_idx
  on tattoo_requests (session_parent_id);
