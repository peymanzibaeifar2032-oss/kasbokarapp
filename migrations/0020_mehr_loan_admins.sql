create table if not exists mehr_loan_admins (
  user_id text primary key,
  created_at timestamptz not null default now()
);

-- Erfan manages only the Mehr-loan inbox, not the site's global admin areas.
insert into mehr_loan_admins (user_id)
select id from "user" where lower(email) = lower('Erfanstv@gmail.com')
on conflict (user_id) do nothing;

update profiles
set is_admin = false
where user_id in (
  select id from "user" where lower(email) = lower('Erfanstv@gmail.com')
);

