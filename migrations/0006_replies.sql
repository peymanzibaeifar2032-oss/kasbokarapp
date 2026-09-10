update reviews
set owner_reply = 'ممنون از لطف شما. برای نوبت بعدی اولویت با مشتریان قبلی است.',
    owner_reply_at = now() - interval '10 days'
where id = 'rev-1' and owner_reply is null;

update reviews
set owner_reply = 'نکته پارکینگ را روی صفحه گذاشتیم. سپاس از بازخورد دقیق.',
    owner_reply_at = now() - interval '2 days'
where id = 'rev-4' and owner_reply is null;

update reviews
set owner_reply = 'خوشحالیم جلسه مشاوره شفاف بوده. موفق باشید.',
    owner_reply_at = now() - interval '7 days'
where id = 'rev-5' and owner_reply is null;
