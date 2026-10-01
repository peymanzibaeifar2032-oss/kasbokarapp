update studio_artists
   set name = 'هانا زیبائی‌فر'
 where lower(email) = 'hanazibaeifar88h@gmail.com';

update "user"
   set name = 'هانا زیبائی‌فر', "updatedAt" = now()
 where lower(email) = 'hanazibaeifar88h@gmail.com';

update profiles
   set display_name = 'هانا زیبائی‌فر'
 where user_id in (select id from "user" where lower(email) = 'hanazibaeifar88h@gmail.com');

update businesses b
   set owner_id = owner.id, updated_at = now()
  from "user" owner
 where lower(owner.email) in ('peyman.zibaeifar2032@gmail.com', 'peymanzibaeifar2032@gmail.com')
   and b.owner_id in (select id from "user" where lower(email) = 'hanazibaeifar88h@gmail.com')
   and (b.id = 'biz-peyman-studio' or b.name ilike '%پیمان%' or b.name ilike '%تاتو%');
