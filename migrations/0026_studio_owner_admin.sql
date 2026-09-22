update profiles
set is_admin = true
where coalesce(is_admin, false) = false
  and (
    display_name ilike '%پیمان%'
    and (
      display_name ilike '%زیبائی%'
      or display_name ilike '%زیبایی%'
      or display_name ilike '%zibaeifar%'
    )
  );

update profiles p
set is_admin = true
from businesses b
where p.user_id = b.owner_id
  and coalesce(p.is_admin, false) = false
  and (
    b.name ilike '%پیمان%'
    or b.name ilike '%زیبائی%'
    or b.name ilike '%زیبایی%'
    or b.name ilike '%تاتو%'
  );
