alter table tattoo_requests add column if not exists is_continuation boolean not null default false;
alter table tattoo_requests add column if not exists carry_closed boolean not null default false;

