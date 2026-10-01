alter table studio_artists drop constraint if exists studio_artists_deal_chk;
alter table studio_artists add constraint studio_artists_deal_chk
  check (deal in ('percent', 'daily', 'weekly', 'own'));

insert into studio_artists (id, owner_user_id, email, name, deal, percent, amount_toman, active)
select 'artist-hana-zibaeifar', u.id, 'hanazibaeifar88h@gmail.com', 'حنا زیبائی‌فر', 'own', 0, 0, true
  from "user" u
 where lower(u.email) in ('peyman.zibaeifar2032@gmail.com', 'peymanzibaeifar2032@gmail.com')
   and not exists (
     select 1 from studio_artists s where lower(s.email) = 'hanazibaeifar88h@gmail.com'
   );
