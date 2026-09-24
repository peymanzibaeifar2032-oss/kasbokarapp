alter table studio_fill_ins alter column idea drop not null;
alter table studio_fill_ins alter column idea set default '';
alter table studio_fill_ins add column if not exists design_image text;
alter table studio_fill_ins add column if not exists price_toman int;
