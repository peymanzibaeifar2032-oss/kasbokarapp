-- Guest customers look up status with a short code, not an account.
alter table tattoo_requests add column if not exists tracking_code text;

do $$
declare r record;
declare code text;
begin
  for r in select id from tattoo_requests where tracking_code is null loop
    loop
      code := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
      exit when not exists (select 1 from tattoo_requests where tracking_code = code);
    end loop;
    update tattoo_requests set tracking_code = code where id = r.id;
  end loop;
end $$;

create unique index if not exists tattoo_requests_tracking_code_uidx on tattoo_requests (tracking_code);
alter table tattoo_requests alter column tracking_code set not null;
