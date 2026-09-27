alter table studio_fill_ins add column if not exists call_count int not null default 0;
alter table studio_fill_ins add column if not exists came_count int not null default 0;
alter table studio_fill_ins add column if not exists missed_count int not null default 0;
