alter table studio_customer_files add column if not exists tolerance_hours text not null default '';
alter table studio_customer_files add column if not exists hydration text not null default '';
