alter table tattoo_requests add column if not exists design_quotes jsonb not null default '[]'::jsonb;
