alter table studio_fill_ins add column if not exists designs jsonb not null default '[]'::jsonb;
