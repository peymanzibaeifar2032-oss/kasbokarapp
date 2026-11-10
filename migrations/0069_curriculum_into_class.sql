-- Put the v2 curriculum into the class tables the app and the teach panel already use.
update tattoo_modules set is_active = false, updated_at = now() where id not like 'cur-mod-%';

insert into tattoo_modules (id, title, description, "order", is_active, updated_at)
values ('cur-mod-p1', $qxjj3qai0$بخش ۱ — پایه و ایمنی$qxjj3qai0$, $q84r0dr2c$مسیر کارآموزی، پوست و ترمیم، کنترل عفونت. پیش از دست زدن به دستگاه.$q84r0dr2c$, 1, true, now())
on conflict (id) do update set title = excluded.title, description = excluded.description, "order" = excluded."order", is_active = true, updated_at = now();
insert into tattoo_modules (id, title, description, "order", is_active, updated_at)
values ('cur-mod-p2', $q30n4k2bp$بخش ۲ — ابزار و مواد$q30n4k2bp$, $q1g0vh4km$دستگاه، سوزن، کارتریج و رنگ؛ شناختن ابزار پیش از تمرین روی پوست مصنوعی.$q1g0vh4km$, 2, true, now())
on conflict (id) do update set title = excluded.title, description = excluded.description, "order" = excluded."order", is_active = true, updated_at = now();
insert into tattoo_modules (id, title, description, "order", is_active, updated_at)
values ('cur-mod-p3', $qmmq929a7$بخش ۳ — طراحی و بدن$qmmq929a7$, $q45if36oc$طراحی روی کاغذ، نوشته، مرجع، جای طرح روی بدن و استنسیل.$q45if36oc$, 3, true, now())
on conflict (id) do update set title = excluded.title, description = excluded.description, "order" = excluded."order", is_active = true, updated_at = now();
insert into tattoo_modules (id, title, description, "order", is_active, updated_at)
values ('cur-mod-p4', $qm10izxy7$بخش ۴ — اجرا$qm10izxy7$, $qa1lnx2cw$مشتری و رضایت، کار دست روی پوست، خط، سایه، رنگ، مراقبت و عوارض.$qa1lnx2cw$, 4, true, now())
on conflict (id) do update set title = excluded.title, description = excluded.description, "order" = excluded."order", is_active = true, updated_at = now();
insert into tattoo_modules (id, title, description, "order", is_active, updated_at)
values ('cur-mod-p5', $qzpzbs9a1$بخش ۵ — پیشرفته و حرفه‌ای$qzpzbs9a1$, $qqk76pi60$ترمیم، کاور، پروژهٔ بزرگ، سبک‌ها، نمونه‌کار، قیمت‌گذاری و مسئولیت حرفه‌ای.$qqk76pi60$, 5, true, now())
on conflict (id) do update set title = excluded.title, description = excluded.description, "order" = excluded."order", is_active = true, updated_at = now();
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c01', 'cur-mod-p1', $qrtmt0s8v$فصل ۱ — ورود به حرفه$qrtmt0s8v$, 1)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c02', 'cur-mod-p1', $q6q3zkg93$فصل ۲ — پوست و ترمیم$q6q3zkg93$, 2)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c03', 'cur-mod-p1', $q5v5gzzqr$فصل ۳ — کنترل عفونت$q5v5gzzqr$, 3)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c04', 'cur-mod-p2', $qb9uei2fv$فصل ۴ — دستگاه تاتو$qb9uei2fv$, 4)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c05', 'cur-mod-p2', $q1tnngpvo$فصل ۵ — سوزن و کارتریج$q1tnngpvo$, 5)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c06', 'cur-mod-p2', $q6s8evzfd$فصل ۶ — رنگ تاتو$q6s8evzfd$, 6)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c07', 'cur-mod-p3', $qaz4dg769$فصل ۷ — طراحی$qaz4dg769$, 7)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c08', 'cur-mod-p3', $qgmwx994o$فصل ۸ — بدن و استنسیل$qgmwx994o$, 8)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c09', 'cur-mod-p4', $q7o3nlhq5$فصل ۹ — مشتری و جلسه$q7o3nlhq5$, 9)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c10', 'cur-mod-p4', $qthnwkt70$فصل ۱۰ — دست روی پوست$qthnwkt70$, 10)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c11', 'cur-mod-p4', $q20mojpw3$فصل ۱۱ — خط، سایه و رنگ$q20mojpw3$, 11)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c12', 'cur-mod-p4', $q7zk94a7a$فصل ۱۲ — بعد از جلسه$q7zk94a7a$, 12)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c13', 'cur-mod-p5', $qo663h2n9$فصل ۱۳ — کار پیشرفته$qo663h2n9$, 13)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c14', 'cur-mod-p5', $qdt13pmvb$فصل ۱۴ — سبک‌ها$qdt13pmvb$, 14)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lesson_groups (id, module_id, title, "order")
values ('cur-grp-c15', 'cur-mod-p5', $qzhupps68$فصل ۱۵ — حرفه و مسئولیت$qzhupps68$, 15)
on conflict (id) do update set module_id = excluded.module_id, title = excluded.title, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-01', 'cur-mod-p1', $qppgfzxl2$مسیر کارآموزی، اخلاق حرفه‌ای و حد کارآموز$qppgfzxl2$, $ql0oz97iz$سطح
مبتدی

خلاصه
کارآموزی تاتو یک مسیر مرحله‌به‌مرحله است: اول ایمنی و شناخت پوست، بعد ابزار و طراحی، بعد تمرین روی پوست مصنوعی، و فقط در پایان و با نظر استاد کار روی انسان.

هدف‌ها
- مراحل مسیر کارآموزی این استودیو را به ترتیب نام ببری.
- مرز کاری کارآموز را با کار استاد و کار پزشک تشخیص بدهی.
- اصول اخلاق حرفه‌ای در برخورد با مشتری، طرح و اطلاعات شخصی را توضیح بدهی.

مسیر، نه میان‌بُر
تاتو یعنی ایجاد زخم کنترل‌شده و گذاشتن رنگدانه در میان‌پوست. هر خطای فنی روی بدن یک انسان باقی می‌ماند؛ برای همین آموزش در این استودیو پله‌ای است و هیچ پله‌ای با پله‌ی بعد جابه‌جا نمی‌شود.

ترتیب درس‌نامه همان ترتیب کار است: پوست و ترمیم ← کنترل عفونت ← دستگاه، سوزن و رنگ ← طراحی و بدن ← مشتری و اجرا ← مراقبت و عوارض ← کار پیشرفته و حرفه.

- مرحلهٔ ۱: دانش پایه (پوست، بهداشت، ابزار) و آزمون شفاهی با استاد.
- مرحلهٔ ۲: طراحی روی کاغذ و آماده‌سازی استنسیل.
- مرحلهٔ ۳: تمرین خط، سایه و رنگ روی پوست مصنوعی، با چیدمان کامل بهداشتی، انگار مشتری واقعی است.
- مرحلهٔ ۴: دستیاری استاد در جلسه‌های واقعی (چیدمان، پوشش محافظ، جمع‌آوری) بدون دست زدن به دستگاه روی پوست مشتری.
- مرحلهٔ ۵: فقط با تصمیم استاد و پس از قبولی در همهٔ آزمون‌ها، اولین کار کوچک و ساده زیر نظر مستقیم.

قانون همین استودیو
- کارآموز روی پوست مشتری تاتو نمی‌زند؛ کار مشتری را خود پیمان زیبائی‌فر انجام می‌دهد.
- پنجشنبه‌ها روز کلاس است و نوبت مشتری ثبت نمی‌شود.
- قیمت، بیعانه و زمان نوبت مشتری را کارآموز تعیین یا وعده نمی‌کند.
- هر جا جواب در درس نیست، از استاد پرسیده می‌شود؛ حدس زدن در کار با پوست و خون جایی ندارد.

اخلاق حرفه‌ای
مشتری بدنش را به تو می‌سپارد. صداقت درباره‌ی محدودیت طرح، اندازه، جای بدن و ماندگاری رنگ، بخشی از کار فنی است، نه تعارف.

- طرح دیگران را بدون اجازه کپی نکن (فصل ۷).
- عکس مشتری فقط با رضایت کتبی و بدون نشانهٔ هویتی منتشر می‌شود.
- اطلاعات سلامت مشتری محرمانه است و فقط برای ایمنی همان جلسه پرسیده می‌شود.
- تشخیص بیماری و تجویز دارو کار پزشک است؛ کار تو دیدن نشانهٔ هشدار و ارجاع است.
- زیر اثر الکل یا مواد، یا با فرد زیر سن قانونی و بدون شرایط قانونی، کار انجام نمی‌شود.

نکته‌های کلیدی
- ترتیب: ایمنی ← ابزار ← طراحی ← تمرین مصنوعی ← دستیاری ← کار کوچک با اجازهٔ استاد.
- کارآموز روی مشتری تاتو نمی‌زند.
- تشخیص و درمان پزشکی بیرون از حد کار تاتو است.

هشدار
- کارآموز روی پوست مشتری تاتو نمی‌زند؛ همهٔ تمرین‌ها روی کاغذ، پوست مصنوعی یا میوه انجام می‌شود.

تمرین
هدف: مسیر کارآموزی و مرزهای کاری را بدون نگاه به متن توضیح بدهی.
وسایل: کاغذ
1. پنج مرحلهٔ مسیر را به ترتیب بنویس و جلوی هر کدام یک معیار قبولی بگذار.
2. سه موقعیت بنویس که باید کار را به استاد یا پزشک بسپاری.
3. یک جملهٔ مؤدبانه بنویس برای وقتی مشتری از تو قیمت یا نوبت می‌خواهد.
قبول وقتی:
- ترتیب مراحل درست باشد.
- هیچ‌کدام از موقعیت‌ها شامل تشخیص یا تجویز دارو توسط تو نباشد.

واژه‌ها
- پوست مصنوعی (Practice skin): ورقهٔ تمرینی سیلیکونی یا لاستیکی برای تمرین بدون آسیب به انسان.
- رضایت‌نامهٔ آگاهانه (Informed consent): تأیید کتبی مشتری پس از دانستن طرح، خطر، مراقبت و هزینه.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
$ql0oz97iz$, 1, true, 'cur-grp-c01', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-01-a', 'cur-01', '/api/tattoo/curriculum-image/cur-01-a', 'curriculum', $qkdchozsw$مسیر کارآموزی: هر پله پیش‌شرط پلهٔ بعد است.$qkdchozsw$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-02', 'cur-mod-p1', $qbls85ks2$برنامهٔ تمرین و پوست مصنوعی$qbls85ks2$, $qg12p9mg9$سطح
مبتدی

خلاصه
تمرین منظم روی پوست مصنوعی، مهارت دست را پیش از کار روی انسان می‌سازد؛ به شرط آنکه هر جلسهٔ تمرین با همان چیدمان بهداشتی و همان دقت جلسهٔ واقعی انجام شود.

هدف‌ها
- تفاوت تمرین روی کاغذ، پوست مصنوعی و پوست میوه را بدانی.
- یک جلسهٔ تمرین را از چیدمان تا جمع‌آوری کامل اجرا کنی.
- پیشرفت خود را با برگهٔ تمرین ثبت و ارزیابی کنی.

ابزار تمرین و محدودیت هر کدام
پوست مصنوعی «بخشنده‌تر» از پوست انسان است. خطی که روی آن خوب است، روی انسان ممکن است بیش از حد عمیق یا سطحی باشد. برای همین تمرین مصنوعی پیش‌نیاز است، نه مجوز.

- کاغذ و قلم: کنترل خط، ترکیب‌بندی و ارزش رنگی؛ بدون عمق.
- پوست مصنوعی (سیلیکونی یا لاستیکی): تمرین کشش، زاویه، سرعت دست و یکنواختی خط. واکنش آن با پوست انسان یکی نیست؛ خونریزی، تورم و پس‌زدن رنگ ندارد.
- پوست میوه (مثل پرتقال یا طالبی): تمرین روی سطح منحنی؛ آن هم مانند پوست زنده رفتار نمی‌کند.

جلسهٔ تمرین مثل جلسهٔ واقعی
- شستن دست، دستکش، پوشش محافظ روی دستگاه و سیم، کاپ یک‌بارمصرف.
- کارتریج نو برای هر جلسه؛ کارتریجی که پوست مصنوعی را سوراخ کرده هم در ظرف تیز می‌رود.
- پایان جلسه: جمع‌آوری از تمیز به کثیف، دور انداختن پوشش‌ها، ضدعفونی سطح.

برنامهٔ پیشنهادی هفتگی
- طراحی روزانه: ۲۰ دقیقه خط و دایرهٔ آزاد، ۲۰ دقیقه نوار ارزش رنگی.
- دو جلسهٔ پوست مصنوعی در هفته: خط مستقیم، منحنی، دایره؛ بعد سایهٔ ساده.
- هر جلسه عکس با نور یکسان و برگهٔ تمرین: کارتریج، تنظیم دستگاه، مشکل اصلی، اصلاح جلسهٔ بعد.
- بازبینی هفتگی با استاد در کلاس پنجشنبه.

نکته‌های کلیدی
- تمرین مصنوعی پیش‌نیاز است، نه مجوز کار روی انسان.
- چیدمان بهداشتی در تمرین هم کامل اجرا می‌شود تا عادت شود.
- پیشرفت با برگهٔ تمرین و عکس ثبت می‌شود، نه با حافظه.

هشدار
- کارتریج و سوزن تمرینی را دوباره به کار نبر و روی بدن خودت یا دوستان «امتحان» نکن.

تمرین
هدف: یک جلسهٔ کامل تمرین را از چیدمان تا جمع‌آوری اجرا و ثبت کنی.
وسایل: پوست مصنوعی، کارتریج لاینر، رنگ مشکی، کاپ، دستکش، پوشش محافظ
1. چیدمان کامل میز را انجام بده و از آن عکس بگیر.
2. ده خط مستقیم ۵ سانتی و پنج دایره بزن.
3. میز را به ترتیب درست جمع کن.
4. برگهٔ تمرین را پر کن.
قبول وقتی:
- در هیچ مرحله دستکش آلوده به وسیلهٔ تمیز نخورد.
- برگهٔ تمرین کامل و عکس‌ها با نور یکسان باشد.

واژه‌ها
- پوست مصنوعی (Practice skin): ورقهٔ تمرینی سیلیکونی یا لاستیکی برای تمرین بدون آسیب به انسان.
- پوشش محافظ (Barrier film): پوشش یک‌بارمصرف روی دستگاه، سیم و سطح‌هایی که با دستکش لمس می‌شوند.
- ظرف تیز (سیفتی‌باکس) (Sharps container): ظرف مقاوم به سوراخ‌شدن برای سوزن و تیغ مصرف‌شده.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
$qg12p9mg9$, 2, true, 'cur-grp-c01', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-02-a', 'cur-02', '/api/tattoo/curriculum-image/cur-02-a', 'curriculum', $q312mvmb9$نمونهٔ تمرین ثبت‌شده: هر جلسه یک عکس و یک برگه.$q312mvmb9$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-03', 'cur-mod-p1', $q0u87v0ue$ساختار پوست و جای نشستن رنگ$q0u87v0ue$, $q6h2ebu8z$سطح
مبتدی

خلاصه
پوست سه لایهٔ اصلی دارد: روپوست، میان‌پوست و زیرپوست. رنگ تاتو فقط وقتی ماندگار می‌شود که در میان‌پوست بنشیند؛ سطحی‌تر می‌ریزد و عمیق‌تر پخش می‌شود.

هدف‌ها
- سه لایهٔ پوست و نقش هر کدام را در تاتو توضیح بدهی.
- بگویی چرا رنگ در روپوست نمی‌ماند و در زیرپوست پخش می‌شود.
- تفاوت ضخامت پوست در نقاط مختلف بدن را در برنامهٔ کار در نظر بگیری.

روپوست (Epidermis)
روپوست لایهٔ بیرونی و بدون رگ خونی است. سلول‌های آن در لایهٔ پایه (لایهٔ زاینده) ساخته می‌شوند، به‌تدریج بالا می‌آیند و در لایهٔ شاخی به سلول مردهٔ پرکراتین تبدیل می‌شوند و می‌ریزند. سلول‌های رنگ‌ساز پوست (ملانوسیت‌ها) هم در همین لایهٔ پایه‌اند.

چون روپوست مدام نو می‌شود، رنگی که فقط در آن بنشیند در دورهٔ پوسته‌ریزی می‌رود. کم‌رنگ‌شدن طبیعی چند روز اول بخشی از همین رنگ سطحی است.

میان‌پوست (Dermis)
میان‌پوست از بافت همبند (کلاژن و الاستین) ساخته شده و رگ خونی، عصب، فولیکول مو و غدد را در خود دارد. دو بخش دارد: بخش پاپیلاری (بالایی، نازک‌تر) و بخش رتیکولار (عمیق‌تر و ضخیم‌تر).

ذرات رنگدانه در میان‌پوست می‌مانند؛ بخشی از آن‌ها را سلول‌های ایمنی (ماکروفاژها) و سلول‌های بافت همبند در خود نگه می‌دارند. همین است که تاتو را دائمی می‌کند. خون‌آمدن حین کار نشان می‌دهد سوزن به میان‌پوست رسیده؛ خونریزی زیاد اما نشانهٔ کار درست نیست.

زیرپوست (Hypodermis)
زیر میان‌پوست لایهٔ چربی است. رنگی که به این لایه برسد پخش می‌شود و دور خط هالهٔ آبی‌خاکستری می‌سازد (بلوآوت). این خطا معمولاً قابل پاک کردن با سوزن نیست.

ضخامت پوست در بدن یکسان نیست
- کف دست و کف پا روپوست ضخیم دارند و رنگ را خوب نگه نمی‌دارند.
- پلک، مچ داخلی، پشت گوش، روی استخوان‌ها و پوست افراد مسن نازک‌اند؛ بلوآوت آسان‌تر رخ می‌دهد.
- پشت، ران و بازوی بیرونی معمولاً ضخیم‌ترند.
- در آموزش رایج عمق کار را «حدود ۱ تا ۲ میلی‌متر» می‌گویند. این عدد فقط تصویر ذهنی است، نه دستور: معیار درست، خواندن نتیجه است (فصل ۱۰).

نکته‌های کلیدی
- رنگ ماندگار = رنگ در میان‌پوست.
- خیلی سطحی: ریزش رنگ. خیلی عمیق: بلوآوت.
- عمق ثابت برای همهٔ بدن وجود ندارد.

هشدار
- این درس آموزش کالبدشناسی برای تاتو است و جای تشخیص بیماری پوست نیست؛ هر ضایعهٔ مشکوک به پزشک ارجاع می‌شود.

تمرین
هدف: مقطع پوست را بکشی و جای درست رنگ را نشان بدهی.
وسایل: کاغذ و مداد رنگی
1. مقطع پوست را با سه لایه بکش و نام فارسی هر لایه را بنویس.
2. سه سوزن بکش: یکی در روپوست، یکی در میان‌پوست، یکی در چربی؛ نتیجهٔ هر کدام را کنارش بنویس.
3. پنج نقطه از بدن را از نازک به ضخیم مرتب کن.
قبول وقتی:
- بتوانی بگویی چرا رنگ سطحی می‌ریزد و رنگ عمیق پخش می‌شود.

واژه‌ها
- روپوست (Epidermis): لایهٔ بیرونی و نازک پوست که مدام نو می‌شود و رنگ را نگه نمی‌دارد.
- میان‌پوست (Dermis): لایهٔ زیر روپوست، از بافت همبند؛ جای ماندگار رنگ تاتو.
- زیرپوست (لایهٔ چربی) (Hypodermis): لایهٔ چربی زیر میان‌پوست؛ رسیدن رنگ به آن باعث پخش‌شدن و هاله می‌شود.
- بلوآوت (پخش‌شدگی رنگ) (Blowout): هالهٔ آبی‌خاکستری دور خط، معمولاً از ورود رنگ به عمق نادرست یا کشش و زاویهٔ غلط.
- ملانین (Melanin): رنگدانهٔ طبیعی پوست که در روپوست ساخته می‌شود و دیده‌شدن رنگ تاتو را تغییر می‌دهد.

منابع
- Anatomy, Skin (Integument), Epidermis. StatPearls / NCBI Bookshelf
- Anatomy, Skin (Integument). StatPearls / NCBI Bookshelf
- Tattoos, Temporary Tattoos & Permanent Makeup. U.S. FDA
$q6h2ebu8z$, 3, true, 'cur-grp-c02', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-03-a', 'cur-03', '/api/tattoo/curriculum-image/cur-03-a', 'curriculum', $qlq8ejupq$رنگ فقط در میان‌پوست ماندگار است.$qlq8ejupq$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-03-x1-skin-structures', 'cur-03', '/api/tattoo/curriculum-image/cur-03-x1-skin-structures', 'curriculum', $qnqw9g4sz$پوست سه لایه دارد: روپوست (Epidermis)، میان‌پوست (Dermis) و زیرپوست (Hypodermis). رگ، فولیکول مو و غدد در میان‌پوست‌اند و رنگ تاتو هم همین‌جا ماندگار می‌شود.$qnqw9g4sz$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-03-x2-ink-in-dermis', 'cur-03', '/api/tattoo/curriculum-image/cur-03-x2-ink-in-dermis', 'curriculum', $qmejeh4zw$ذرات رنگ در بخش بالایی و میانی میان‌پوست می‌مانند و ماکروفاژها و سلول‌های بافت همبند آن‌ها را نگه می‌دارند؛ رنگ در روپوست با پوسته می‌ریزد و در زیرپوست پخش می‌شود (بلوآوت).$qmejeh4zw$, 3)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-04', 'cur-mod-p1', $qnbalc1im$ترمیم زخم تاتو: مراحل و زمان$qnbalc1im$, $q2pyy8mag$سطح
مبتدی

خلاصه
تاتوی تازه یک زخم سطحی گسترده است و مانند هر زخمی از سه مرحلهٔ هم‌پوشان می‌گذرد: التهاب، بازسازی و بلوغ. سطح در چند هفته بسته می‌شود، ولی بلوغ لایه‌های عمیق ماه‌ها طول می‌کشد.

هدف‌ها
- سه مرحلهٔ ترمیم زخم و نشانهٔ طبیعی هر کدام را بشناسی.
- زمان مناسب قضاوت دربارهٔ رنگ نهایی و ترمیم را بدانی.
- نشانه‌های طبیعی را از نشانه‌های هشدار جدا کنی.

سه مرحلهٔ ترمیم
- التهاب (چند روز اول): قرمزی، گرمی، تورم خفیف، ترشح شفاف یا کمی رنگی، حساسیت به لمس. بدن خونریزی را بند می‌آورد و سلول‌های ایمنی محل را پاک می‌کنند.
- بازسازی (از روزهای اول تا چند هفته): پوست نو از لبه‌ها و فولیکول‌ها رشد می‌کند، پوسته و خارش ظاهر می‌شود و پوسته‌ها خودبه‌خود می‌افتند.
- بلوغ (از چند هفته تا ماه‌ها): کلاژن مرتب می‌شود؛ سطح ممکن است تا مدتی براق یا «شیری» به نظر برسد و بعد شفاف شود.

زمان‌بندی کاربردی
سطح بیشتر تاتوها در حدود دو تا چهار هفته بسته به نظر می‌رسد. این زمان به اندازه و جای کار، مقدار ضربه به پوست، سلامت فرد و مراقبت بستگی دارد. رنگ نهایی و نیاز به ترمیم معمولاً پس از بسته‌شدن کامل و آرام شدن پوست قضاوت می‌شود؛ در این استودیو ترمیم را زودتر از پایان دورهٔ ترمیم وعده نده.

طبیعی یا هشدار؟
- طبیعی: قرمزی و تورم که هر روز کمتر می‌شود، پوسته و خارش، کدر بودن موقت رنگ.
- هشدار: قرمزی یا دردی که هر روز بیشتر و گسترده‌تر شود، چرک، بوی بد، تب یا لرز، زخم باز، تاول یا جوش‌های دردناک در طرح.
- نشانهٔ هشدار با «پماد بزن» جواب داده نمی‌شود؛ مشتری به پزشک ارجاع می‌شود (درس عوارض).

نکته‌های کلیدی
- سه مرحله: التهاب ← بازسازی ← بلوغ.
- بسته شدن سطح ≠ پایان ترمیم.
- قرمزیِ رو به افزایش و تب = ارجاع به پزشک.

هشدار
- زمان‌ها تقریبی‌اند. برای مشتری فقط برگهٔ مراقبت همین استودیو داده می‌شود (درس ۳۰).

تمرین
هدف: روند ترمیم را برای مشتری با زبان ساده توضیح بدهی.
وسایل: کاغذ
1. یک خط زمانی بکش و سه مرحله را روی آن بنویس.
2. برای هر مرحله یک نشانهٔ طبیعی و یک نشانهٔ هشدار بنویس.
3. توضیح شفاهی یک‌دقیقه‌ای برای مشتری تمرین کن.
قبول وقتی:
- هیچ نشانهٔ هشداری در ستون «طبیعی» نیامده باشد.

واژه‌ها
- کلوئید (Keloid): جوشگاه برجسته‌ای که از حد زخم بیرون می‌زند.

منابع
- Physiology, Wound Healing. StatPearls / NCBI Bookshelf
- Tattoos: 7 unexpected skin reactions and what to do about them. American Academy of Dermatology
- Caring for tattooed skin. American Academy of Dermatology
$q2pyy8mag$, 4, true, 'cur-grp-c02', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-04-a', 'cur-04', '/api/tattoo/curriculum-image/cur-04-a', 'curriculum', $qftmbzgkq$مراحل ترمیم هم‌پوشان‌اند و زمان‌ها تقریبی‌اند.$qftmbzgkq$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-04-b', 'cur-04', '/api/tattoo/curriculum-image/cur-04-b', 'curriculum', $qjiye40wv$همان کار در سه زمان: تازه، پوسته، خوب‌شده.$qjiye40wv$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-05', 'cur-mod-p1', $qlgf75cmd$تنوع پوست: تیره، نازک، مسن، آفتاب و خال$qlgf75cmd$, $qrqz06zus$سطح
مبتدی

خلاصه
رنگ پوست، سن، آفتاب‌سوختگی و خال‌ها روی دیده شدن رنگ، ترمیم و ایمنی کار اثر دارند. طرح و برنامهٔ کار باید با همان پوست هماهنگ شود.

هدف‌ها
- اثر ملانین بر دیده شدن رنگ تاتو را توضیح بدهی.
- احتیاط‌های پوست نازک و مسن را بدانی.
- بدانی چرا روی خال و پوست آفتاب‌سوخته کار نمی‌شود.

پوست تیره و گندمی
ملانین در روپوست ساخته و ذخیره می‌شود و رنگ تاتو در میان‌پوست می‌نشیند؛ پس رنگ تاتو از پشت لایه‌ای رنگدانه‌دار دیده می‌شود. نتیجهٔ عملی‌ای که هنرمندان گزارش می‌کنند: روی پوست تیره، مشکی و ارزش‌های تیره کنتراست خوبی دارند، ولی رنگ‌های خیلی روشن (زرد کم‌رنگ، سفید، پاستلی) کمتر دیده می‌شوند. این یک قاعدهٔ تجربی طراحی است، نه یافتهٔ پزشکی.

لک تیرهٔ پس از التهاب (هایپرپیگمانتاسیون پس از التهاب) بعد از هر آسیب یا التهاب پوست ممکن است رخ دهد و در پوست‌های تیره‌تر شایع‌تر، شدیدتر و ماندگارتر است. انجمن پوست آمریکا هم به کسی که زمینهٔ جوشگاه برجسته (کلوئید) دارد توصیه می‌کند در تاتو کردن تجدیدنظر کند. پس پرسیدن سابقهٔ جوشگاه در مشاوره و پرهیز از آسیب بی‌مورد به پوست مهم است.

پوست نازک و مسن
- روش استودیو: پوست نازک (مچ داخلی، روی استخوان، پوست مسن) را محتاط‌تر کار می‌کنیم، چون به تجربهٔ ما کشش کمتری را تحمل می‌کند و بلوآوت آسان‌تر رخ می‌دهد.
- دست سبک‌تر، عبور کمتر روی یک نقطه، طرح ساده‌تر با فاصلهٔ خط بیشتر.
- در پوست مسن ترمیم ممکن است کندتر باشد؛ این را پیش از کار به مشتری بگو.

آفتاب و خال
- قاعدهٔ استودیو: روی پوست آفتاب‌سوخته، پوسته‌دار یا تحریک‌شده کار نمی‌شود؛ جلسه عقب می‌افتد.
- انجمن پوست آمریکا توصیه می‌کند هنرمند دور خال‌ها، کک‌مک و لکه‌ها کار کند، چون رنگ تاتو ظاهر خال را تغییر می‌دهد و تشخیص زودهنگام سرطان پوست را سخت‌تر می‌کند. دور خال فاصله بگذار یا طرح را جابه‌جا کن.
- خالی که تغییر اندازه، رنگ یا شکل داده، خونریزی یا خارش دارد، اول باید پزشک پوست ببیند.

نکته‌های کلیدی
- روی پوست تیره، کنتراست و ارزش رنگی مهم‌تر از فام است.
- پوست نازک = دست سبک و عبور کمتر.
- روی خال و پوست آفتاب‌سوخته کار نکن.

هشدار
- این درس تشخیص پوستی نیست. ضایعهٔ مشکوک فقط با نظر پزشک بررسی می‌شود.

تمرین
هدف: یک طرح را برای سه نوع پوست تطبیق بدهی.
وسایل: کاغذ، مداد و ماژیک خاکستری
1. یک طرح گل ساده بکش.
2. نسخه‌ای برای پوست تیره بکش: خط محکم‌تر، ارزش‌های تیره‌تر، بدون جزئیات خیلی روشن.
3. نسخه‌ای برای پوست نازک بکش: جزئیات کمتر و فاصلهٔ خط بیشتر.
قبول وقتی:
- تفاوت سه نسخه با دلیل فنی توضیح داده شود.

واژه‌ها
- ملانین (Melanin): رنگدانهٔ طبیعی پوست که در روپوست ساخته می‌شود و دیده‌شدن رنگ تاتو را تغییر می‌دهد.
- کلوئید (Keloid): جوشگاه برجسته‌ای که از حد زخم بیرون می‌زند.
- ارزش رنگی (روشنی و تیرگی) (Value): میزان روشنی یا تیرگی یک رنگ، مستقل از فام.

منابع
- Do tattoos cause skin cancer?. American Academy of Dermatology
- Tattoos: 7 unexpected skin reactions and what to do about them. American Academy of Dermatology
- Anatomy, Skin (Integument), Epidermis. StatPearls / NCBI Bookshelf
- Postinflammatory Hyperpigmentation. StatPearls / NCBI Bookshelf
$qrqz06zus$, 5, true, 'cur-grp-c02', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-05-a', 'cur-05', '/api/tattoo/curriculum-image/cur-05-a', 'curriculum', $q7aef8suo$روی پوست تیره، کنتراست و ارزش رنگی مهم‌تر از فام است؛ خاکستری روشن و جزئیات ریز کمتر دیده می‌شوند.$q7aef8suo$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-06', 'cur-mod-p1', $qzyd6thqr$عوامل بیماری‌زای خونی، احتیاط استاندارد و فرو رفتن سوزن$qzyd6thqr$, $qzm1ug680$سطح
مبتدی

خلاصه
هپاتیت B، هپاتیت C و اچ‌آی‌وی از راه خون منتقل می‌شوند. در تاتو با خون هر فرد طوری رفتار می‌شود که انگار آلوده است؛ این «احتیاط استاندارد» است.

هدف‌ها
- سه عامل بیماری‌زای خونی مهم و راه انتقال آن‌ها را نام ببری.
- اصول احتیاط استاندارد را در تاتو به کار ببری.
- اقدام فوری پس از فرو رفتن سوزن آلوده را به ترتیب انجام بدهی.

خطر چیست؟
عوامل بیماری‌زای خونی میکروب‌هایی در خون انسان‌اند که بیماری ایجاد می‌کنند؛ مهم‌ترینشان ویروس هپاتیت B، هپاتیت C و اچ‌آی‌وی است. فرو رفتن سوزن یا تیغ آلوده، یا پاشیدن خون به چشم، دهان، بینی یا پوست زخمی، راه اصلی انتقال در محیط کار است.

بسیاری از ناقلان علامت ندارند یا از بیماری خود خبر ندارند. پس «مشتری سالم به نظر می‌رسد» هیچ ارزشی در تصمیم بهداشتی ندارد.

احتیاط استاندارد در تاتو
- خون و ترشح هر مشتری را آلوده فرض کن.
- پیش از دستکش و بلافاصله پس از درآوردن آن، بهداشت دست.
- دستکش یک‌بارمصرف برای هر مشتری؛ تعویض در صورت پارگی یا لمس سطح غیرتمیز.
- سوزن و هر چیز تیز مستقیم در ظرف تیز؛ هرگز درپوش‌گذاری دوباره یا خم کردن با دست.
- پوشش محافظ روی هر سطحی که با دستکش آلوده لمس می‌شود.
- زخم یا خراش دست خودت با پوشش ضدآب بسته شود.

اگر سوزن به دست خودت رفت
- کار را متوقف کن و دستکش را دربیاور.
- محل را فوراً با آب فراوان بشوی و با آب و صابون تمیز کن؛ اگر خون به چشم، بینی یا دهان پاشید، با آب فراوان بشوی.
- محل را فشار نده، نمک و مادهٔ ناشناخته نریز.
- به استاد خبر بده؛ زمان، نوع سوزن و شرح اتفاق را بنویس.
- همان روز و هرچه زودتر به پزشک یا اورژانس مراجعه کن. تصمیم دربارهٔ آزمایش و درمان پیشگیری با پزشک است و زمان در آن اهمیت دارد.

واکسن هپاتیت B
واکسن هپاتیت B برای کسانی که در تماس شغلی با خون هستند توصیهٔ استاندارد است؛ در قانون کار آمریکا کارفرما باید آن را به کارکنان در معرض خطر پیشنهاد کند. برای وضعیت واکسن خود با پزشک یا مرکز بهداشت مشورت کن. واکسن جای دستکش، ظرف تیز و استریل را نمی‌گیرد.

نکته‌های کلیدی
- خون همه را آلوده فرض کن.
- تیز مستقیم به ظرف تیز؛ بدون درپوش‌گذاری.
- فرو رفتن سوزن: شستن ← گزارش ← پزشک همان روز.

هشدار
- پس از تماس با خون، صبر کردن یا «خودش خوب می‌شود» خطرناک است؛ مراجعهٔ پزشکی فوری لازم است.

تمرین
هدف: اقدام‌های پس از تماس با خون را بدون مکث اجرا کنی.
وسایل: کاغذ، دستکش، ظرف تیز تمرینی
1. سناریوی «سوزن به انگشتم رفت» را با هم‌کلاسی نقش‌آفرینی کن.
2. پنج اقدام را به ترتیب بگو و اجرا کن.
3. فرم ثبت حادثه را پر کن.
قبول وقتی:
- ترتیب اقدام‌ها درست و مراجعه به پزشک جزو آن باشد.
- سوزن در هیچ مرحله درپوش‌گذاری نشود.

واژه‌ها
- احتیاط استاندارد (Standard precautions): رفتار با خون و مایعات بدن همهٔ افراد به‌عنوان آلودهٔ احتمالی.
- ظرف تیز (سیفتی‌باکس) (Sharps container): ظرف مقاوم به سوراخ‌شدن برای سوزن و تیغ مصرف‌شده.
- پوشش محافظ (Barrier film): پوشش یک‌بارمصرف روی دستگاه، سیم و سطح‌هایی که با دستکش لمس می‌شوند.

منابع
- Bloodborne Pathogens and Needlestick Prevention. OSHA (U.S. Department of Labor)
- Standard 29 CFR 1910.1030 — Bloodborne pathogens. OSHA
- Hepatitis B — fact sheet. World Health Organization
- Clinical Safety: Hand Hygiene for Healthcare Workers. CDC
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
$qzm1ug680$, 6, true, 'cur-grp-c03', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-06-a', 'cur-06', '/api/tattoo/curriculum-image/cur-06-a', 'curriculum', $qaazc4t38$اقدام فوری پس از تماس با خون.$qaazc4t38$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-06-x1-sharps-container', 'cur-06', '/api/tattoo/curriculum-image/cur-06-x1-sharps-container', 'curriculum', $q2n8aqbv0$سوزن و هر چیز تیز مستقیم به ظرف تیز می‌رود؛ بدون درپوش‌گذاری دوباره و بدون فشار دادن با دست.$q2n8aqbv0$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-07', 'cur-mod-p1', $qnnsqhkkq$تمیز کردن، ضدعفونی و استریل$qnnsqhkkq$, $qsbb4fymg$سطح
مبتدی

خلاصه
تمیز کردن، ضدعفونی و استریل سه کار متفاوت‌اند. نوع رسیدگی به هر وسیله به خطر آن بستگی دارد: آنچه پوست را سوراخ می‌کند یا استریل و یک‌بارمصرف است، یا باید استریل شود.

هدف‌ها
- سه مفهوم تمیز کردن، ضدعفونی و استریل را دقیق تعریف کنی.
- وسایل استودیو را بر اساس خطر دسته‌بندی کنی.
- پایش اتوکلاو و معنای آزمون اسپور را توضیح بدهی.

سه کار متفاوت
الکل وسیلهٔ مصرف‌شده را استریل نمی‌کند و جوشاندن جایگزین اتوکلاو نیست.

- تمیز کردن: برداشتن خون، رنگ، چربی و آلودگی قابل‌دیدن با آب و شوینده. بدون تمیز کردن، ضدعفونی و استریل هم کامل اثر نمی‌کنند.
- ضدعفونی: کاهش شدید میکروب‌ها روی سطح یا وسیله با مادهٔ مناسب و زمان تماس درج‌شده روی برچسب. هاگ را به‌طور کامل از بین نمی‌برد.
- استریل کردن: از بین بردن همهٔ شکل‌های میکروب، از جمله هاگ. برای وسیلهٔ فلزی مقاوم به حرارت، روش رایج بخار تحت فشار (اتوکلاو) است.

دسته‌بندی بر اساس خطر (روش اسپالدینگ)
مرکز کنترل بیماری آمریکا برای انتخاب روش، وسایل را در سه دسته می‌گذارد. در تاتو می‌توان آن را چنین به کار برد:

- بحرانی (وارد بافت می‌شود): سوزن، کارتریج و هر چیز تیز ⇐ استریل و یک‌بارمصرف از بستهٔ سالم.
- نیمه‌بحرانی (تماس با پوست آسیب‌دیده): گریپ و تیوب فلزی چندبارمصرف ⇐ تمیز کردن، بسته‌بندی و اتوکلاو پس از هر مشتری؛ یا نوع یک‌بارمصرف.
- غیربحرانی (تماس با پوست سالم یا محیط): تخت، میز، چراغ، صندلی ⇐ تمیز کردن و ضدعفونی سطح، به‌علاوهٔ پوشش محافظ.

اتوکلاو و پایش آن
- وسیله پیش از اتوکلاو کاملاً تمیز و خشک و در بستهٔ مخصوص استریل گذاشته می‌شود.
- چرخه طبق دفترچهٔ همان دستگاه انتخاب می‌شود.
- پایش سه‌گانه: مکانیکی (زمان، دما، فشار هر چرخه)، شیمیایی (نشانگر روی بسته فقط می‌گوید بسته در معرض حرارت بوده) و زیستی (آزمون اسپور).
- مرکز کنترل بیماری آمریکا پایش اتوکلاو با نشانگر زیستی را دست‌کم هفته‌ای یک بار توصیه می‌کند؛ اگر آزمون مثبت شد، دستگاه از کار خارج و طبق دستور بررسی می‌شود.
- تاریخ و شمارهٔ چرخه روی بسته و در دفتر ثبت می‌شود.

ضدعفونی سطح
- اول تمیز کن، بعد ضدعفونی کن.
- محصول مناسب سطح و زمان تماس روی برچسب را رعایت کن؛ زودتر خشک کردن یعنی ضدعفونی ناقص.
- ظرف شوینده یا محلول را روی ته‌ماندهٔ قبلی پر نکن.

نکته‌های کلیدی
- تمیز کردن ≠ ضدعفونی ≠ استریل.
- هر چه پوست را سوراخ می‌کند: استریل و یک‌بارمصرف.
- نشانگر روی بسته کافی نیست؛ آزمون اسپور دوره‌ای لازم است.

هشدار
- سوزن و کارتریج مصرف‌شده هرگز دوباره استریل و استفاده نمی‌شود.
- دستور مرجع بهداشت محل کار تو بر این متن مقدم است.

تمرین
هدف: وسایل استودیو را درست دسته‌بندی کنی.
وسایل: فهرست ۱۵ وسیلهٔ استودیو
1. هر وسیله را در یکی از سه دستهٔ بحرانی، نیمه‌بحرانی و غیربحرانی بگذار.
2. جلوی هر وسیله روش رسیدگی را بنویس.
3. سه نوع پایش اتوکلاو و کار هر کدام را توضیح بده.
قبول وقتی:
- هیچ وسیلهٔ بحرانی با «ضدعفونی» رسیدگی نشده باشد.

واژه‌ها
- تمیز کردن (Cleaning): برداشتن آلودگی قابل‌دیدن با آب و شوینده؛ پیش‌شرط ضدعفونی و استریل.
- ضدعفونی (Disinfection): کاهش شدید میکروب‌ها روی سطح؛ هاگ را حذف نمی‌کند.
- استریل کردن (Sterilization): از بین بردن همهٔ شکل‌های میکروب، از جمله هاگ؛ برای وسیلهٔ فلزی معمولاً با اتوکلاو.
- اتوکلاو (Autoclave): دستگاه استریل با بخار تحت فشار.
- آزمون اسپور (Biological indicator / spore test): آزمون زیستی که کشته‌شدن هاگ مقاوم را در چرخهٔ اتوکلاو ثابت می‌کند.

منابع
- A Rational Approach to Disinfection and Sterilization (Spaulding classification), Guideline for Disinfection and Sterilization in Healthcare Facilities 2008. CDC
- Sterilizing Practices — monitoring with mechanical, chemical and biological indicators. CDC
- Steam Sterilization. CDC
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
$qsbb4fymg$, 7, true, 'cur-grp-c03', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-07-a', 'cur-07', '/api/tattoo/curriculum-image/cur-07-a', 'curriculum', $q26t5vvd1$روش رسیدگی به خطر وسیله بستگی دارد.$q26t5vvd1$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-07-b', 'cur-07', '/api/tattoo/curriculum-image/cur-07-b', 'curriculum', $queffzcsa$سه کار متفاوت با سه نتیجهٔ متفاوت.$queffzcsa$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-08', 'cur-mod-p1', $qu6ljpnt3$ایستگاه کار، دستکش و جلوگیری از آلودگی متقاطع$qu6ljpnt3$, $q5t65kyni$سطح
مبتدی

خلاصه
چیدمان درست ایستگاه کار مسیر آلودگی را قطع می‌کند: منطقهٔ تمیز و آلوده جدا، همه‌چیز پیش از پوشیدن دستکش آماده، و هر سطحی که با دستکش لمس می‌شود پوشیده.

هدف‌ها
- ایستگاه کار را با منطقهٔ تمیز و آلودهٔ مشخص بچینی.
- زمان‌های تعویض دستکش و بهداشت دست را بدانی.
- راه‌های رایج آلودگی متقاطع را شناسایی و حذف کنی.

ترتیب چیدمان
- سطح میز و تخت را تمیز و ضدعفونی کن.
- دست را بشوی و دستکش بپوش.
- پوشش محافظ روی دستگاه، سیم کلیپ، منبع تغذیه، بطری‌ها و چراغ.
- همهٔ وسایل لازم را از قبل بچین: کاپ‌ها، رنگ، کارتریج‌های بسته، دستمال، وازلین یا مادهٔ لغزنده در ظرف کوچک یک‌بارمصرف.
- رنگ از بطری به کاپ ریخته می‌شود؛ سر بطری به کاپ و دستکش آلوده نمی‌خورد و هیچ رنگی به بطری برنمی‌گردد.

منطقهٔ تمیز و آلوده
میز را به دو منطقه تقسیم کن: منطقهٔ تمیز برای وسایل باز نشده و منطقهٔ آلوده برای وسایل مصرف‌شده. هیچ چیزی از منطقهٔ آلوده به تمیز برنمی‌گردد. ظرف تیز در دسترس دست کار و نزدیک ایستگاه است.

دستکش و دست
- دستکش جای شستن دست را نمی‌گیرد: پیش از پوشیدن و پس از درآوردن، بهداشت دست.
- تعویض دستکش: پارگی، لمس تلفن، صورت، مو، بطری بدون پوشش، دستگیره یا هر سطح بدون پوشش؛ و پیش از رفتن از کار آلوده به کار تمیز.
- ناخن کوتاه؛ انگشتر و دستبند هنگام کار درآورده شود.
- دستکش نیتریل گزینهٔ رایج است؛ حساسیت به لاتکس را در مشتری و خودت بپرس.

آماده‌سازی پوست مشتری
- اصلاح مو با تیغ یک‌بارمصرف، آرام و بدون خراش.
- پاک کردن پوست با مادهٔ ضدعفونی پوستِ مناسب، روی گاز تمیز و نه مستقیم از سر بطری روی پوست.
- اگر پوست حین کار با سطح آلوده تماس پیدا کرد، دستکش عوض و ناحیه دوباره تمیز شود.

جمع‌آوری پس از کار
- تیزها اول و مستقیم به ظرف تیز.
- کاپ‌ها، دستمال‌ها و پوشش‌ها در کیسهٔ پسماند طبق قاعدهٔ محلی.
- دستکش آلوده را درآور، دست را بشوی، دستکش تمیز بپوش و سطح‌ها را تمیز و ضدعفونی کن.

نکته‌های کلیدی
- همه‌چیز پیش از شروع آماده؛ وسط کار دنبال وسیله نگرد.
- رنگ از کاپ به بطری برنمی‌گردد.
- دستکشی که به چیز بدون پوشش خورد دیگر تمیز نیست.

هشدار
- خوردن، آشامیدن و سیگار در محدودهٔ کار ممنوع است.
- ظرف تیز را بیش از خط پر شدن پر نکن و با دست فشار نده.

تمرین
هدف: یک ایستگاه کار کامل را بچینی و جمع کنی.
وسایل: میز، پوشش محافظ، دستکش، کاپ، کارتریج بسته، ظرف تیز
1. ایستگاه را با منطقهٔ تمیز و آلودهٔ مشخص بچین.
2. استاد در میانهٔ تمرین سه «اتفاق» ایجاد می‌کند (مثلاً زنگ تلفن)؛ واکنش درست را انجام بده.
3. جمع‌آوری را به ترتیب انجام بده.
قبول وقتی:
- هیچ آلودگی متقاطعی دیده نشود.
- ترتیب جمع‌آوری درست باشد.

واژه‌ها
- آلودگی متقاطع (Cross-contamination): انتقال آلودگی از وسیله، سطح یا دست آلوده به چیز تمیز یا به فرد دیگر.
- پوشش محافظ (Barrier film): پوشش یک‌بارمصرف روی دستگاه، سیم و سطح‌هایی که با دستکش لمس می‌شوند.
- ظرف تیز (سیفتی‌باکس) (Sharps container): ظرف مقاوم به سوراخ‌شدن برای سوزن و تیغ مصرف‌شده.
- احتیاط استاندارد (Standard precautions): رفتار با خون و مایعات بدن همهٔ افراد به‌عنوان آلودهٔ احتمالی.

منابع
- Clinical Safety: Hand Hygiene for Healthcare Workers. CDC
- WHO Guidelines on Hand Hygiene in Health Care (2009). World Health Organization
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
- Standard 29 CFR 1910.1030 — Bloodborne pathogens. OSHA
$q5t65kyni$, 8, true, 'cur-grp-c03', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-08-a', 'cur-08', '/api/tattoo/curriculum-image/cur-08-a', 'curriculum', $qlexusbd1$مسیر وسایل یک‌طرفه است: از تمیز به آلوده.$qlexusbd1$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-08-b', 'cur-08', '/api/tattoo/curriculum-image/cur-08-b', 'curriculum', $qpv77yu75$رنگ هرگز از کاپ به بطری برنمی‌گردد.$qpv77yu75$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-08-x1-glove-moments', 'cur-08', '/api/tattoo/curriculum-image/cur-08-x1-glove-moments', 'curriculum', $qprzf6h8n$پیش از پوشیدن و پس از درآوردن دستکش بهداشت دست لازم است؛ دستکشی که به چیز بدون پوشش خورد دیگر تمیز نیست.$qprzf6h8n$, 3)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-09', 'cur-mod-p2', $qbyl9h1od$دستگاه تاتو: کویل، روتاری، قلمی و منبع تغذیه$qbyl9h1od$, $qosh5menx$سطح
مبتدی

خلاصه
سه خانوادهٔ اصلی دستگاه تاتو با سازوکار متفاوت سوزن را بالا و پایین می‌برند. شناخت سازوکار، رفتار هر دستگاه را روی پوست قابل پیش‌بینی می‌کند.

هدف‌ها
- سازوکار دستگاه کویل، روتاری و قلمی را توضیح بدهی.
- اجزای اصلی سامانهٔ برق (منبع تغذیه، پدال، کابل) را بشناسی.
- ایمنی برق و پوشش محافظ دستگاه را رعایت کنی.

کویل (Coil)
دو سیم‌پیچ الکتریکی آهنربای موقت می‌سازند و یک تیغهٔ فنری (آرمیچر) را پایین می‌کشند؛ با قطع مدار فنر آن را برمی‌گرداند. صدای وزوز آشنا از همین چرخه است. کویل‌ها معمولاً برای لاینر یا شیدر تنظیم می‌شوند و تنظیم فنر و فاصلهٔ تماس مهارت جداگانه‌ای می‌خواهد.

روتاری (Rotary)
یک موتور الکتریکی می‌چرخد و یک بادامک یا محور خارج از مرکز، چرخش را به حرکت رفت‌وبرگشتی تبدیل می‌کند. معمولاً سبک‌تر، کم‌صداتر و یکنواخت‌ترند و برای شروع کنترل‌پذیرتر به نظر می‌رسند.

قلمی (Pen)
روتاری‌ای که در بدنهٔ استوانه‌ای شبیه قلم ساخته شده و با کارتریج کار می‌کند. بعضی مدل‌ها بی‌سیم و باتری‌دارند و بعضی طول ضربهٔ قابل تغییر دارند. شکل قلمی گرفتن آن را آسان می‌کند، ولی جای مهارت کشش و عمق را نمی‌گیرد.

سامانهٔ برق و ایمنی
- منبع تغذیه ولتاژ را تنظیم می‌کند؛ پدال یا کلید دستگاه را روشن و خاموش می‌کند.
- کابل و منبع تغذیه از آب و مایع دور باشند؛ کابل فرسوده یا لخت تعویض شود.
- دستگاه، کلیپ کابل و منبع تغذیه پیش از هر مشتری با پوشش محافظ یک‌بارمصرف پوشیده شوند.
- دستگاه کسی را بدون اجازه باز یا تنظیم نکن؛ نگهداری فقط طبق دستور سازنده.

نکته‌های کلیدی
- کویل: آهنربا و فنر. روتاری: موتور و بادامک. قلمی: روتاری با بدنهٔ قلم و کارتریج.
- دستگاه بهتر جای دست درست را نمی‌گیرد.
- برق و مایع از هم دور؛ همه‌چیز زیر پوشش محافظ.

هشدار
- دستگاه، کابل و منبع تغذیه نباید در تماس با مایع یا دست خیس روشن شوند.

تمرین
هدف: سازوکار سه دستگاه را با شکل توضیح بدهی و یک دستگاه را درست بپوشانی.
وسایل: کاغذ، دستگاه تمرینی، پوشش محافظ
1. شکل سادهٔ سه دستگاه را بکش و قطعهٔ ایجادکنندهٔ حرکت را علامت بزن.
2. یک دستگاه روتاری و کابلش را کامل با پوشش محافظ بپوشان.
3. پنج خطر برق در ایستگاه را نام ببر.
قبول وقتی:
- پوشش بدون درز باشد و دکمه‌ها قابل استفاده بمانند.

واژه‌ها
- طول ضربه (Stroke): مسافت رفت‌وبرگشت سوزن در هر ضربه؛ ضربهٔ بلند ضربهٔ قوی‌تر می‌دهد.
- ولتاژ (Voltage): ولتاژ منبع تغذیه که سرعت (و در کویل، رفتار) دستگاه را تعیین می‌کند؛ عدد ثابت جهانی ندارد.
- پوشش محافظ (Barrier film): پوشش یک‌بارمصرف روی دستگاه، سیم و سطح‌هایی که با دستکش لمس می‌شوند.
- کارتریج (Cartridge): سوزن یک‌بارمصرف در بدنهٔ پلاستیکی؛ اغلب با غشای جلوگیری از برگشت مایع.

منابع
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
- Tattoo Needle Configuration Guide: Gauges, Tapers and Types Explained. Melbourne Tattoo Supplies
$qosh5menx$, 1, true, 'cur-grp-c04', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-a', 'cur-09', '/api/tattoo/curriculum-image/cur-09-a', 'curriculum', $quhvbforp$سه سازوکار برای یک کار: حرکت رفت‌وبرگشتی سوزن.$quhvbforp$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-x1-coil-parts-a', 'cur-09', '/api/tattoo/curriculum-image/cur-09-x1-coil-parts-a', 'curriculum', $qmw4k09f9$در کویل، دو سیم‌پیچ آرمیچر را پایین می‌کشند و فنر آن را برمی‌گرداند؛ پیچ تماس مدار را قطع و وصل می‌کند.$qmw4k09f9$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-x1-coil-parts-b', 'cur-09', '/api/tattoo/curriculum-image/cur-09-x1-coil-parts-b', 'curriculum', $qxen621gj$سر آرمیچر گروه سوزن را می‌گیرد؛ گیرهٔ لوله، گریپ و نوک سوزن را هدایت می‌کنند و کلیپ کابل برق را به قاب می‌رساند.$qxen621gj$, 3)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-x2-rotary-parts', 'cur-09', '/api/tattoo/curriculum-image/cur-09-x2-rotary-parts', 'curriculum', $qfh7qito5$در روتاری، موتور می‌چرخد و بادامک چرخش را به حرکت رفت‌وبرگشتی سوزن تبدیل می‌کند.$qfh7qito5$, 4)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-x3-pen-parts', 'cur-09', '/api/tattoo/curriculum-image/cur-09-x3-pen-parts', 'curriculum', $qqijqjfa5$دستگاه قلمی روتاری‌ای در بدنهٔ استوانه‌ای است که با کارتریج کار می‌کند؛ بعضی مدل‌ها بی‌سیم‌اند.$qqijqjfa5$, 5)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-x4-power', 'cur-09', '/api/tattoo/curriculum-image/cur-09-x4-power', 'curriculum', $q2bcpzq0n$منبع تغذیه ولتاژ را تنظیم می‌کند و پدال دستگاه را روشن و خاموش می‌کند؛ برق و مایع از هم دور.$q2bcpzq0n$, 6)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-p1-coil-photo', 'cur-09', '/api/tattoo/curriculum-image/cur-09-p1-coil-photo', 'curriculum', $qcqqu3din$یک دستگاه کویل لاینر؛ دو سیم‌پیچ، فنرها و پیچ تماس دیده می‌شوند.$qcqqu3din$, 7)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-p2-rotary-photo', 'cur-09', '/api/tattoo/curriculum-image/cur-09-p2-rotary-photo', 'curriculum', $qlxs694ro$یک دستگاه روتاری با گریپ و کابل اتصال.$qlxs694ro$, 8)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-09-p3-pen-photo', 'cur-09', '/api/tattoo/curriculum-image/cur-09-p3-pen-photo', 'curriculum', $qyk2lqhl7$دستگاه قلمی با کیسهٔ محافظ یک‌بارمصرف و نوار کشی دور گریپ برای گرفتن راحت‌تر، در دست دستکش‌دار.$qyk2lqhl7$, 9)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-10', 'cur-mod-p2', $qvfd8w8jp$ولتاژ، طول ضربه و سرعت دست$qvfd8w8jp$, $qefvfdf63$سطح
مبتدی

خلاصه
کیفیت خط از هماهنگی سه چیز می‌آید: سرعت ضربهٔ دستگاه (ولتاژ)، قدرت ضربه (طول ضربه) و سرعت حرکت دست. هیچ عدد ثابتی برای همهٔ کارها وجود ندارد.

هدف‌ها
- رابطهٔ ولتاژ، طول ضربه و سرعت دست را توضیح بدهی.
- علت خط نقطه‌نقطه، خط کم‌رنگ و پوست جویده‌شده را تشخیص بدهی.
- تنظیم را روی پوست مصنوعی، با یک متغیر در هر بار، انجام بدهی.

سه متغیر
- ولتاژ: در روتاری عمدتاً سرعت چرخش و تعداد ضربه در ثانیه را تغییر می‌دهد.
- طول ضربه: مسافت رفت‌وبرگشت سوزن. ضربهٔ کوتاه نرم‌تر و برای سایهٔ ملایم، ضربهٔ بلندتر قوی‌تر و برای خط و اشباع رایج‌تر است.
- سرعت دست: مسافتی که دست در هر ثانیه روی پوست طی می‌کند.

خواندن نتیجه
- خط نقطه‌نقطه یا بریده: دست برای سرعت دستگاه زیادی تند است.
- پوست جویده، ورم‌کرده یا خط پهن و تار: دست زیادی کند است یا چند بار روی یک خط رفته‌ای.
- رنگ ننشسته با وجود سرعت درست: اول کشش پوست و عمق را بررسی کن، بعد ولتاژ.

روش تنظیم
عدد ولتاژ مناسب به دستگاه، طول ضربه، سوزن، تیپر و پوست بستگی دارد. نقطهٔ شروع، دفترچهٔ سازندهٔ همان دستگاه است. روی پوست مصنوعی هر بار فقط یک متغیر را تغییر بده و نتیجه را در برگهٔ تمرین ثبت کن. تنظیم نهایی روی مشتری با استاد است.

نکته‌های کلیدی
- ولتاژ = سرعت؛ طول ضربه = قدرت؛ دست = مسافت در زمان.
- اول کشش و عمق، بعد سرعت دست، آخر ولتاژ.
- هر بار فقط یک متغیر را تغییر بده.

هشدار
- بالا بردن ولتاژ یا فشار دست برای جبران پوست شل یا سوزن نامناسب، پوست را آسیب می‌زند.

تمرین
هدف: اثر سرعت دست را با ولتاژ ثابت ببینی.
وسایل: پوست مصنوعی، لاینر ۷ یا ۹، رنگ مشکی
1. با ولتاژ ثابت سه خط ۵ سانتی بزن: یکی تند، یکی متوسط، یکی کند.
2. سپس با سرعت دست ثابت، ولتاژ را دو پله تغییر بده و دو خط دیگر بزن.
3. نتیجه‌ها را عکس بگیر و توضیح بده.
قبول وقتی:
- بتوانی خط پیوسته، نقطه‌نقطه و جویده را از هم تشخیص بدهی و علت هر کدام را بگویی.

واژه‌ها
- ولتاژ (Voltage): ولتاژ منبع تغذیه که سرعت (و در کویل، رفتار) دستگاه را تعیین می‌کند؛ عدد ثابت جهانی ندارد.
- طول ضربه (Stroke): مسافت رفت‌وبرگشت سوزن در هر ضربه؛ ضربهٔ بلند ضربهٔ قوی‌تر می‌دهد.

منابع
- Tattoo Needle Configuration Guide: Gauges, Tapers and Types Explained. Melbourne Tattoo Supplies
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qefvfdf63$, 2, true, 'cur-grp-c04', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-10-a', 'cur-10', '/api/tattoo/curriculum-image/cur-10-a', 'curriculum', $qpz6idqgj$سرعت دست باید با سرعت ضربهٔ دستگاه هماهنگ باشد.$qpz6idqgj$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-11', 'cur-mod-p2', $qxj1b73lm$کد سوزن، گیج و تیپر$qxj1b73lm$, $q5dzuuv7r$سطح
مبتدی

خلاصه
روی جعبهٔ سوزن یک کد کوتاه است که گیج، تعداد سوزن و نوع چیدمان را می‌گوید. گیج قطر هر سیم است و تیپر بلندی نوک تیز آن.

هدف‌ها
- کدهایی مثل 1205RL و 1207CM را درست بخوانی.
- گیج‌های رایج و قطر تقریبی هر کدام را بدانی.
- اثر تیپر بلند و کوتاه را توضیح بدهی.

خواندن کد
- مثال 1205RL: دو رقم اول گیج (۱۲)، دو رقم بعد تعداد سوزن (۵)، حروف چیدمان (RL = لاینر گرد).
- 1207CM: گیج ۱۲، هفت سوزن، مگنوم خمیده.
- 1003RL: گیج ۱۰، سه سوزن، لاینر گرد.
- بعضی سازندگان کد را کمی متفاوت می‌نویسند؛ اگر میلی‌متر روی جعبه درج شده، همان معتبرتر است.

گیج (قطر سیم)
گیج یعنی قطر هر سیم، نه تعداد سوزن‌ها. در سوزن تاتو عدد بزرگ‌تر یعنی سیم کلفت‌تر؛ این را با گیج سیم برق قاطی نکن.

- گیج ۰۸ ≈ ۰٫۲۵ میلی‌متر: خیلی نازک؛ جزئیات ریز.
- گیج ۱۰ ≈ ۰٫۳۰ میلی‌متر (در جدول بسیاری از سازندگان «باگ‌پین» نامیده می‌شود): خط ظریف و سایهٔ نرم.
- گیج ۱۲ ≈ ۰٫۳۵ میلی‌متر: استاندارد رایج؛ خط خوانا و پر کردن.
- سیم نازک جوهر کمتری در هر ضربه می‌گذارد و برای جزئیات است؛ سیم کلفت زودتر پر می‌کند ولی با دست سنگین پوست را بیشتر می‌آزارد.

تیپر (نوک سوزن)
- تیپر بلند: نوک باریک‌تر و تدریجی‌تر. طبق توضیح سازندگان برای خط نازک و سایهٔ ملایم به کار می‌رود.
- تیپر کوتاه: نوک پهن‌تر. سازندگان آن را برای رنگ‌گذاری بیشتر در هر ضربه و پر کردن سریع‌تر معرفی می‌کنند؛ این مقایسه توصیف سازندگان است و آزمون مستقل علمی برایش پیدا نشد.
- نام‌گذاری طول تیپر بین سازندگان یکسان نیست؛ جدول همان برند را بخوان.
- تیپر جای کشش و عمق درست را نمی‌گیرد.

نکته‌های کلیدی
- کد = گیج + تعداد + چیدمان.
- ۰۸≈۰٫۲۵، ۱۰≈۰٫۳۰، ۱۲≈۰٫۳۵ میلی‌متر.
- میلی‌متر روی جعبه از نام گیج معتبرتر است.

هشدار
- برای تمرین خط، لاینر ۷ یا ۹ با گیج ۱۲ خواناتر از لاینر ۳ خیلی نازک است؛ لاینر خیلی نازک خطا را دیر نشان می‌دهد.

تمرین
هدف: ده کد سوزن را بدون خطا بخوانی.
وسایل: ده جعبهٔ سوزن یا کارت کد
1. هر کد را به گیج، تعداد و چیدمان تجزیه کن.
2. برای هر کد یک کاربرد مناسب بنویس.
3. دو سوزن با تیپر متفاوت را زیر ذره‌بین مقایسه کن.
قبول وقتی:
- ده از ده کد درست خوانده شود.

واژه‌ها
- گیج (Gauge): قطر هر سیم سوزن؛ در کارتریج تاتو عدد بزرگ‌تر یعنی سیم کلفت‌تر.
- تیپر (Taper): طول بخش مخروطی نوک سوزن؛ تیپر بلند نوک باریک‌تر و تیپر کوتاه جوهرگذاری بیشتر.
- لاینر گرد (Round Liner, RL): سوزن‌هایی که در دایره‌ای فشرده لحیم شده‌اند؛ برای خط.
- شیدر گرد (Round Shader, RS): دایرهٔ بازتر از لاینر؛ برای سایهٔ کوچک، پرکردن جای تنگ و خط نرم.
- مگنوم بافته (Weaved Magnum, M1): دو ردیف سوزن درهم؛ برای پرکردن و سایهٔ سطح بزرگ. با فلت (یک ردیف صاف) فرق دارد.
- مگنوم خمیده (Curved Magnum, CM/RM): مگنوم با لبهٔ قوسی؛ لبهٔ نرم‌تر و سایهٔ یکدست‌تر روی انحنا.

منابع
- Tattoo Needle Configuration Guide: Gauges, Tapers and Types Explained. Melbourne Tattoo Supplies
- Tattoo Needle Size Chart & Configuration Guide. Lineage Needle Co
$q5dzuuv7r$, 1, true, 'cur-grp-c05', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-11-a', 'cur-11', '/api/tattoo/curriculum-image/cur-11-a', 'curriculum', $qsn6gi91y$خواندن کد سوزن: گیج، تعداد، چیدمان.$qsn6gi91y$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-11-b', 'cur-11', '/api/tattoo/curriculum-image/cur-11-b', 'curriculum', $qk9vu6vlg$تیپر بلند نوک باریک‌تر دارد.$qk9vu6vlg$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-12', 'cur-mod-p2', $qnrq9u0yq$گروه‌بندی سوزن، کارتریج و گریپ$qnrq9u0yq$, $qfx182r0i$سطح
مبتدی

خلاصه
چیدمان سوزن‌ها شکل اثر روی پوست را تعیین می‌کند: لاینر برای خط، شیدر گرد برای سایهٔ کوچک، مگنوم برای سطح. کارتریج و گریپ هم بخشی از سامانهٔ بهداشتی‌اند.

هدف‌ها
- RL، RS، M1 و CM را از روی شکل و کاربرد بشناسی.
- سوزن مناسب هر بخش طرح را انتخاب کنی.
- تفاوت سیستم کارتریج و سوزن-تیوب سنتی و قواعد بهداشتی هر کدام را بدانی.

خانواده‌های اصلی
- لاینر گرد (RL): دایرهٔ فشرده؛ خط تمیز. تعداد بیشتر = خط پهن‌تر.
- شیدر گرد (RS): دایرهٔ بازتر؛ سایهٔ کوچک، پر کردن جای تنگ، خط نرم.
- مگنوم بافته (M1): دو ردیف سوزن درهم؛ پر کردن و سایهٔ سطح بزرگ. با «فلت» (F، یک ردیف سوزن صاف) اشتباه نشود.
- مگنوم خمیده (CM یا RM): لبهٔ قوسی؛ تماس یکنواخت‌تر روی انحنا و لبهٔ سایهٔ نرم‌تر.
- انواع دیگر (مثل لاینر تخت یا سوزن‌های بافت‌دار) کاربرد خاص دارند و پس از تسلط بر این چهار خانواده بررسی می‌شوند.

انتخاب سوزن
- اندازهٔ سوزن متناسب با اندازهٔ بخش طرح: مگنوم بزرگ در فضای تنگ لبه را کثیف می‌کند.
- طرح کوچک با سوزن خیلی پهن خوانایی ندارد.
- طبق توضیح سازندگان، لبهٔ نرم مگنوم خمیده در سایه کمتر از لبهٔ مگنوم صاف ردّ تیز به جا می‌گذارد.

کارتریج و گریپ
- کارتریج: سوزن و بدنهٔ یک‌بارمصرف؛ بسیاری غشای جلوگیری از برگشت مایع دارند. کارتریج برای یک مشتری است و پس از مصرف در ظرف تیز می‌رود.
- سوزن و تیوب سنتی: سوزن یک‌بارمصرف است؛ تیوب و گریپ یا یک‌بارمصرف‌اند یا فلزی که پس از هر مشتری تمیز، بسته‌بندی و اتوکلاو می‌شود.
- بستهٔ آسیب‌دیده، خیس یا تاریخ‌گذشته استفاده نمی‌شود.
- گریپ فوم یا لاستیکی یک‌بارمصرف را برای مشتری بعد نگه ندار.

نکته‌های کلیدی
- RL خط، RS سایهٔ کوچک، M1 سطح، CM سطح روی انحنا.
- اندازهٔ سوزن با اندازهٔ بخش طرح هماهنگ.
- کارتریج یک مشتری، یک بار.

هشدار
- سوزن یا کارتریجی که از بسته درآمد و به سطح غیرتمیز یا زمین خورد، دور انداخته می‌شود.

تمرین
هدف: با چهار خانوادهٔ سوزن چهار نمونهٔ اثر روی پوست مصنوعی بسازی.
وسایل: پوست مصنوعی، کارتریج RL، RS، M1 و CM
1. با هر سوزن یک مربع ۳×۳ سانتی کار کن (خط دور با RL، داخل با بقیه).
2. لبهٔ سایهٔ M1 و CM را مقایسه کن.
3. جدول انتخاب سوزن برای یک طرح گل را بنویس.
قبول وقتی:
- تفاوت لبهٔ M1 و CM در عکس دیده و توضیح داده شود.

واژه‌ها
- لاینر گرد (Round Liner, RL): سوزن‌هایی که در دایره‌ای فشرده لحیم شده‌اند؛ برای خط.
- شیدر گرد (Round Shader, RS): دایرهٔ بازتر از لاینر؛ برای سایهٔ کوچک، پرکردن جای تنگ و خط نرم.
- مگنوم بافته (Weaved Magnum, M1): دو ردیف سوزن درهم؛ برای پرکردن و سایهٔ سطح بزرگ. با فلت (یک ردیف صاف) فرق دارد.
- مگنوم خمیده (Curved Magnum, CM/RM): مگنوم با لبهٔ قوسی؛ لبهٔ نرم‌تر و سایهٔ یکدست‌تر روی انحنا.
- کارتریج (Cartridge): سوزن یک‌بارمصرف در بدنهٔ پلاستیکی؛ اغلب با غشای جلوگیری از برگشت مایع.

منابع
- Tattoo Needle Configuration Guide: Gauges, Tapers and Types Explained. Melbourne Tattoo Supplies
- Tattoo Needle Size Chart & Configuration Guide. Lineage Needle Co
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
$qfx182r0i$, 2, true, 'cur-grp-c05', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-12-a', 'cur-12', '/api/tattoo/curriculum-image/cur-12-a', 'curriculum', $q76wkmrbn$چهار خانوادهٔ اصلی سوزن و کاربردشان.$q76wkmrbn$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-12-x1-cartridge-parts', 'cur-12', '/api/tattoo/curriculum-image/cur-12-x1-cartridge-parts', 'curriculum', $qz8urny4j$کارتریج برای یک مشتری است و پس از مصرف در ظرف تیز می‌رود؛ غشا جلوی برگشت مایع را می‌گیرد.$qz8urny4j$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-13', 'cur-mod-p2', $qg1ah6t92$رنگ تاتو: ترکیب، ایمنی و مقررات$qg1ah6t92$, $q4esz8y03$سطح
مبتدی

خلاصه
رنگ تاتو مخلوطی از رنگدانهٔ نامحلول و مایع حامل است که مستقیم وارد میان‌پوست می‌شود. انتخاب رنگ از سازندهٔ شفاف، نگهداری درست و مصرف بهداشتی، بخشی از ایمنی مشتری است.

هدف‌ها
- اجزای اصلی رنگ تاتو را بشناسی.
- اطلاعات لازم روی برچسب رنگ را بخوانی.
- خطرهای آلودگی میکروبی و شیمیایی رنگ را بدانی.

ترکیب
- رنگدانه: ذرهٔ رنگی نامحلول (آلی یا معدنی) که در میان‌پوست می‌ماند.
- مایع حامل: آب و مواد دیگر برای پخش یکنواخت رنگدانه و روان شدن آن.
- مواد کمکی: نگهدارنده، تنظیم‌کنندهٔ غلظت و مانند آن، طبق فرمول سازنده.

مقررات در یک نگاه
در اتحادیهٔ اروپا از ۴ ژانویهٔ ۲۰۲۲ (و برای دو رنگدانهٔ آبی و سبز مشخص از ۴ ژانویهٔ ۲۰۲۳) مقررات ریچ (REACH) استفاده از مواد خطرناک مشخص‌شده در رنگ تاتو را بالاتر از حد تعیین‌شده ممنوع کرده و برچسب‌گذاری با فهرست ترکیبات و شمارهٔ ساخت را لازم دانسته است.

در آمریکا رنگ تاتو زیر نظر سازمان غذا و داروی آمریکا (FDA) در دستهٔ فراورده‌های آرایشی است و این سازمان دربارهٔ آلودگی میکروبی برخی رنگ‌ها هشدار و فراخوان داده است؛ خود کار تاتو را عموماً مقررات محلی تنظیم می‌کند.

قانون هر کشور جداست. این‌ها به‌عنوان معیار ایمنی شناخته‌شده آورده شده‌اند؛ مقررات محل کار خودت را از مرجع بهداشت محلی بپرس.

انتخاب و نگهداری
- رنگی بخر که نام سازنده، فهرست ترکیبات، شمارهٔ ساخت (بچ) و تاریخ انقضا را درج کرده باشد.
- پلمب سالم؛ نگهداری دور از آفتاب و گرما؛ تاریخ باز کردن روی بطری.
- رقیق کردن فقط با مایع توصیه‌شدهٔ سازنده و آب استریل، نه آب لوله‌کشی.
- شمارهٔ ساخت رنگ‌های مصرفی هر مشتری در پروندهٔ او ثبت شود تا در صورت واکنش قابل پیگیری باشد.

خطرها
- آلودگی میکروبی رنگ می‌تواند عفونت ایجاد کند، حتی با کار تمیز.
- واکنش حساسیتی، به‌ویژه به بعضی رنگ‌های قرمز، ممکن است حتی سال‌ها بعد رخ دهد.
- تاتو ممکن است در تصویربرداری MRI به‌ندرت باعث سوزش یا تورم شود؛ مشتری باید پیش از MRI تاتو را اطلاع دهد.

نکته‌های کلیدی
- رنگ بدون برچسب کامل و شمارهٔ ساخت نخر.
- آب لوله‌کشی برای رقیق کردن ممنوع.
- شمارهٔ ساخت رنگ هر مشتری ثبت شود.

هشدار
- رنگ صنعتی، رنگ چاپ و جوهر خودکار هرگز برای تاتو استفاده نمی‌شود.
- متن مقررات، مشاورهٔ حقوقی نیست؛ قانون محلی مقدم است.

تمرین
هدف: برچسب سه رنگ را بررسی و یک رنگ را برای پرونده ثبت کنی.
وسایل: سه بطری رنگ، فرم پروندهٔ مشتری
1. برای هر بطری سازنده، شمارهٔ ساخت، انقضا و ترکیبات را بنویس.
2. یک بطری فاقد اطلاعات لازم را رد کن و دلیلش را بنویس.
3. ثبت رنگ را در فرم نمونهٔ پرونده انجام بده.
قبول وقتی:
- هر سه برچسب کامل بررسی و ثبت شوند.

واژه‌ها
- رنگدانه (Pigment): ذرهٔ رنگی نامحلول که در میان‌پوست می‌ماند.

منابع
- Tattoo inks and permanent make-up. European Chemicals Agency (ECHA)
- Commission Regulation (EU) 2020/2081 — REACH Annex XVII entry 75 (substances in tattoo inks). EUR-Lex
- Tattoos, Temporary Tattoos & Permanent Makeup. U.S. FDA
- Think Before You Ink: Tattoo Safety. U.S. FDA
- Tattoos: 7 unexpected skin reactions and what to do about them. American Academy of Dermatology
$q4esz8y03$, 1, true, 'cur-grp-c06', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-13-a', 'cur-13', '/api/tattoo/curriculum-image/cur-13-a', 'curriculum', $q9p3yxqan$پیش از خرید، این پنج مورد را روی برچسب پیدا کن.$q9p3yxqan$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-14', 'cur-mod-p2', $qjjtcqzyw$ماندگاری رنگ‌ها و رنگ‌شناسی کاربردی$qjjtcqzyw$, $qcgi3wolf$سطح
متوسط

خلاصه
رنگ‌ها روی پوست یکسان پیر نمی‌شوند: پژوهش‌ها نشان می‌دهند آفتاب بعضی رنگدانه‌های زرد و قرمز را تجزیه می‌کند و مقدار رنگدانهٔ قرمز در پوست با گذشت سال‌ها بسیار کم می‌شود. طرح ماندگار بر کنتراست ارزش رنگی تکیه دارد، نه فقط فام.

هدف‌ها
- رفتار رنگ‌های اصلی را در گذر زمان بدانی.
- از چرخهٔ رنگ و ارزش رنگی برای طرح ماندگار استفاده کنی.
- اثر آفتاب و رنگ پوست بر رنگ را در طرح لحاظ کنی.

ماندگاری
- مشکی: در تجربهٔ رایج هنرمندان پایدارترین رنگ و ستون خوانایی طرح است.
- زرد و قرمز آزو (Azo): در آزمایشگاه، رنگدانهٔ زرد ۷۴ (PY74) و قرمز ۲۲ (PR22) زیر نور خورشید یا فرابنفش تجزیه شده‌اند. در نمونه‌های پوست انسان، غلظت رنگدانهٔ قرمز سال‌ها پس از تاتو حدود ۸۷ تا ۹۹ درصد کمتر از مقدار تخمینی هنگام تاتو بود (بخشی با تجزیه، بخشی با انتقال از راه لنف).
- قرمز بیشتر از رنگ‌های دیگر با واکنش حساسیتی همراه بوده است، هرچند هر رنگی ممکن است حساسیت بدهد (انجمن پوست آمریکا).
- سفید و رنگ‌های خیلی روشن: به تجربهٔ هنرمندان زودتر از بقیه دیده‌نشدنی می‌شوند؛ روش استودیو این است که فقط برای هایلایت کوچک به کار روند، نه سطح اصلی.
- انجمن پوست آمریکا: فرابنفش بعضی رنگ‌های تاتو را محو می‌کند؛ پس از ترمیم کامل، ضدآفتاب با SPF ۳۰ یا بیشتر و دوری از سولاریوم جزو مراقبت دائمی است.

ارزش رنگی مهم‌تر از فام
این بخش اصل طراحی و تجربهٔ هنری است، نه یافتهٔ آزمایشگاهی. دو رنگ متفاوت با ارزش رنگی (روشنی) یکسان، از فاصلهٔ چند قدمی یا پس از چند سال در هم حل می‌شوند. آزمون ساده: طرح رنگی را سیاه‌وسفید کن؛ اگر شکل‌ها هنوز از هم جدا هستند، طرح ماندگار است.

چرخهٔ رنگ در تاتو (اصل طراحی)
- رنگ‌های مکمل (مثل قرمز و سبز) کنار هم پرانرژی‌اند ولی مخلوطشان کدر و قهوه‌ای می‌شود.
- برای سایهٔ رنگ، بیشتر از رنگ تیره‌تر هم‌خانواده استفاده کن تا مشکی خالص.
- روی پوست تیره، دامنهٔ رنگ‌های قابل دیدن کمتر است؛ کنتراست ارزشی را بیشتر کن (درس ۵).

نکته‌های کلیدی
- آفتاب دشمن رنگ است؛ ضدآفتاب دائمی.
- آزمون سیاه‌وسفید برای هر طرح رنگی.
- سفید فقط برای هایلایت.

هشدار
- قول «رنگ هرگز کم‌رنگ نمی‌شود» نده؛ ماندگاری به رنگ، پوست، جای بدن، آفتاب و مراقبت بستگی دارد.

تمرین
هدف: یک طرح رنگی را با آزمون ارزش رنگی اصلاح کنی.
وسایل: طرح رنگی، تلفن یا اسکنر برای سیاه‌وسفید کردن
1. طرح رنگی را سیاه‌وسفید کن.
2. جاهایی را که شکل‌ها در هم حل شده‌اند علامت بزن.
3. با تغییر ارزش رنگی (نه فقط فام) اصلاح کن و دوباره آزمون بگیر.
قبول وقتی:
- در نسخهٔ سیاه‌وسفید نهایی همهٔ شکل‌های اصلی جدا دیده شوند.

واژه‌ها
- ارزش رنگی (روشنی و تیرگی) (Value): میزان روشنی یا تیرگی یک رنگ، مستقل از فام.
- رنگدانه (Pigment): ذرهٔ رنگی نامحلول که در میان‌پوست می‌ماند.
- ملانین (Melanin): رنگدانهٔ طبیعی پوست که در روپوست ساخته می‌شود و دیده‌شدن رنگ تاتو را تغییر می‌دهد.

منابع
- Caring for tattooed skin. American Academy of Dermatology
- Tattoos: 7 unexpected skin reactions and what to do about them. American Academy of Dermatology
- Tattoos, Temporary Tattoos & Permanent Makeup. U.S. FDA
- Photodecomposition of Pigment Yellow 74, a pigment used in tattoo inks. Photochem Photobiol 2004 (PubMed 15362942)
- Photochemical cleavage of a tattoo pigment by UVB radiation or natural sunlight. J Dtsch Dermatol Ges 2007 (Engel E. et al., PubMed 17610608)
- The decrease of pigment concentration in red tattooed skin years after tattooing. J Eur Acad Dermatol Venereol 2011 (Lehner K. et al., PubMed 21349116)
$qcgi3wolf$, 2, true, 'cur-grp-c06', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-14-a', 'cur-14', '/api/tattoo/curriculum-image/cur-14-a', 'curriculum', $qx7va32hk$اگر در سیاه‌وسفید خوانا نیست، روی پوست هم ماندگار نیست.$qx7va32hk$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-14-x1-ink-longevity', 'cur-14', '/api/tattoo/curriculum-image/cur-14-x1-ink-longevity', 'curriculum', $qus8fmg9m$ترتیب کیفی بر پایهٔ تجربهٔ رایج هنرمندان، نه دادهٔ اندازه‌گیری‌شده؛ آفتاب بعضی رنگدانه‌های زرد و قرمز را تجزیه می‌کند.$qus8fmg9m$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-15', 'cur-mod-p3', $qc95sqfhs$خط، شکل، حجم و نوار ارزش رنگی$qc95sqfhs$, $qfyzph8xd$سطح
مبتدی

خلاصه
طراحی تاتو پیش از سوزن روی کاغذ ساخته می‌شود. خط مطمئن، شکل ساده، حجم با نور و نوار ارزش رنگی، الفبای هر سبکی است.

هدف‌ها
- خط پیوسته و مطمئن با یک حرکت بکشی.
- شکل‌های پیچیده را به شکل‌های پایه بشکنی.
- نوار پنج‌پله‌ای ارزش رنگی و سایهٔ کره را بسازی.

خط
- خط را با حرکت شانه و آرنج بکش، نه فقط مچ؛ خط بلند با مچ می‌لرزد.
- یک حرکت پیوسته بهتر از چند خط کوتاه روی هم است؛ همین عادت بعداً «خط یک‌عبوره» روی پوست می‌شود.
- ضخامت خط سلسله‌مراتب می‌سازد: دور شکل اصلی ضخیم‌تر، جزئیات داخلی نازک‌تر.

شکل و حجم
هر موضوعی از چند شکل پایه ساخته شده است: دایره، بیضی، مستطیل، مثلث، استوانه. اول شکل‌های پایه، بعد جزئیات. حجم با یک منبع نور مشخص ساخته می‌شود: سمت نور روشن، سمت مقابل تیره، سایهٔ افتاده روی زمین.

نوار ارزش رنگی
- پنج خانه از سفید تا مشکی با فاصلهٔ برابر بساز.
- سپس همان پنج ارزش را روی یک کره پیاده کن.
- روی پوست، ارزش‌های خیلی نزدیک به هم با گذر زمان یکی می‌شوند؛ پس در طرح تاتو ارزش‌ها را واضح‌تر از طراحی کاغذی جدا کن.

نکته‌های کلیدی
- حرکت از شانه، خط یک‌حرکته.
- اول شکل پایه، بعد جزئیات.
- ارزش‌های روی پوست باید واضح‌تر از کاغذ جدا شوند.

تمرین
هدف: کنترل خط و ارزش رنگی را نشان بدهی.
وسایل: کاغذ A4، مداد نرم، ماژیک
1. یک صفحه خط مستقیم و منحنی بلند با یک حرکت.
2. یک صفحه دایره‌های آزاد در سه اندازه.
3. نوار پنج‌پله‌ای و کرهٔ سایه‌دار.
قبول وقتی:
- پله‌های نوار ارزش فاصلهٔ برابر داشته باشند.
- خط‌ها بدون لرزش و تکه‌تکه نباشند.

واژه‌ها
- ارزش رنگی (روشنی و تیرگی) (Value): میزان روشنی یا تیرگی یک رنگ، مستقل از فام.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qfyzph8xd$, 1, true, 'cur-grp-c07', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-15-a', 'cur-15', '/api/tattoo/curriculum-image/cur-15-a', 'curriculum', $qzq62ecai$پنج ارزش رنگی، پایهٔ هر سایه‌زنی.$qzq62ecai$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-16', 'cur-mod-p3', $q5hb6ch84$ترکیب‌بندی، سیلوئت و خوانایی$q5hb6ch84$, $q0oqk4qua$سطح
مبتدی

خلاصه
تاتوی خوب از چند قدم و پس از سال‌ها هم خوانا است. سیلوئت روشن، یک نقطهٔ تمرکز، فضای منفی کافی و موضوع‌های درست‌ساده‌شده (گل، حیوان، دست، چهره) این خوانایی را می‌سازند.

هدف‌ها
- نقطهٔ تمرکز و مسیر چشم را در طرح تعیین کنی.
- خوانایی طرح را با آزمون سیلوئت و فاصله بسنجی.
- موضوع‌های رایج را برای تاتو ساده کنی.

ترکیب‌بندی
- یک نقطهٔ تمرکز اصلی؛ بقیهٔ عناصر در خدمت آن.
- تضاد اندازه: یک عنصر بزرگ، چند متوسط، چند کوچک.
- فضای منفی (پوست خالی) بخشی از طرح است و به چشم استراحت می‌دهد.

سیلوئت و آزمون فاصله
طرح را کاملاً سیاه پر کن. اگر از سیلوئت معلوم است چیست، شکل کلی درست است. سپس طرح را در اندازهٔ واقعی چاپ کن و از سه متری نگاه کن؛ جزئیاتی که دیده نمی‌شوند یا حذف یا بزرگ شوند.

موضوع‌های رایج
- گل: شکل کلی گلبرگ‌ها مهم‌تر از رگبرگ‌هاست؛ گلبرگ‌های روی هم با ارزش رنگی متفاوت جدا شوند.
- حیوان: ژست و سیلوئت را از مرجع بگیر؛ چشم معمولاً نقطهٔ تمرکز است.
- دست: آن را به کف (مکعب) و انگشت‌ها (استوانه‌های سه‌بندی) بشکن.
- سر و چهره: خط وسط و خط چشم‌ها را اول بکش؛ چشم‌ها تقریباً در نیمهٔ ارتفاع سر قرار دارند. اندازه‌گیری خطاهای کوچک چهره در تاتو بزرگ دیده می‌شوند.

نکته‌های کلیدی
- یک نقطهٔ تمرکز.
- آزمون سیلوئت و آزمون سه‌متری.
- جزئیاتی که از فاصله دیده نمی‌شوند حذف یا بزرگ شوند.

هشدار
- طرح خیلی شلوغ و ریز با گذشت سال‌ها در هم می‌رود؛ این را صادقانه به مشتری بگو.

تمرین
هدف: یک طرح شلوغ را خوانا کنی.
وسایل: کاغذ، طرح نمونهٔ شلوغ
1. سیلوئت سیاه طرح را بکش.
2. نقطهٔ تمرکز را علامت بزن و عناصر مزاحم را حذف کن.
3. نسخهٔ نهایی را در اندازهٔ واقعی از سه متری بررسی کن.
قبول وقتی:
- طرح نهایی از سه متری قابل تشخیص باشد.

واژه‌ها
- ارزش رنگی (روشنی و تیرگی) (Value): میزان روشنی یا تیرگی یک رنگ، مستقل از فام.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$q0oqk4qua$, 2, true, 'cur-grp-c07', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-16-a', 'cur-16', '/api/tattoo/curriculum-image/cur-16-a', 'curriculum', $q0z262scu$سیلوئت روشن یعنی طرح خوانا.$q0z262scu$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-17', 'cur-mod-p3', $q2irlw450$نوشته، لترینگ و خوشنویسی فارسی$q2irlw450$, $q9t8u7oyg$سطح
متوسط

خلاصه
نوشته تاتوی پرخطاتری از تصویر است: یک حرف اشتباه یا فاصلهٔ غلط به‌وضوح دیده می‌شود. املا، خوانایی در اندازهٔ واقعی و یکنواختی خط مهم‌تر از ظرافت است.

هدف‌ها
- متن را پیش از استنسیل از نظر املا و معنا با مشتری تأیید کنی.
- حداقل اندازهٔ خوانای نوشته را با آزمون چاپ بسنجی.
- اصول خوشنویسی فارسی و عربی را در طرح تاتو رعایت کنی.

تأیید متن
- متن را مشتری کتبی بفرستد و پس از طراحی، نسخهٔ نهایی را با امضا تأیید کند.
- متن به زبانی که نمی‌دانی را بدون تأیید یک فرد مسلط به آن زبان اجرا نکن.
- اعراب، نقطه‌ها و سرکش‌ها را حرف‌به‌حرف بررسی کن.

خوانایی
- فاصلهٔ داخل حروف (مثل چشمهٔ «ه» و «م») با گذر زمان پر می‌شود؛ نوشتهٔ خیلی کوچک یکی می‌شود.
- یکنواختی ضخامت و فاصلهٔ حروف از نازکی خط مهم‌تر است.
- نوشته را در اندازهٔ واقعی چاپ کن و از فاصلهٔ معمول دیدن بخوان.

خوشنویسی فارسی و عربی
- قلم (نستعلیق، شکسته، ثلث، کوفی و…) را با مشتری مشخص کن؛ ترکیب قلم‌ها بدون آگاهی خطاست.
- اتصال حروف و کشیدگی‌ها قاعده دارند؛ از نمونه‌های خوشنویسان معتبر الهام بگیر و برای طرح خاص از خوشنویس کمک بگیر.
- روی بدن، خط کرسی (خط پایهٔ نوشته) را با جریان بدن تنظیم کن.

نکته‌های کلیدی
- تأیید کتبی متن.
- آزمون چاپ در اندازهٔ واقعی.
- یکنواختی مهم‌تر از نازکی.

هشدار
- کپی نوشتهٔ خوشنویسی یک هنرمند بدون اجازه، نقض حق اثر است (درس ۱۸).

تمرین
هدف: یک کلمهٔ فارسی را برای تاتو آماده کنی.
وسایل: کاغذ، قلم یا نرم‌افزار طراحی
1. کلمه را در دو قلم متفاوت بنویس.
2. هر دو را در سه اندازه چاپ و خوانایی را بسنج.
3. فرم تأیید متن را با هم‌کلاسی به‌عنوان مشتری پر کن.
قبول وقتی:
- کوچک‌ترین اندازهٔ خوانا مشخص و ثبت شده باشد.

واژه‌ها
- استنسیل (Stencil): کپی طرح روی پوست برای راهنمای خط.

منابع
- The Complex Guide To Tattoo Lettering. Complex (2011)
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- Understanding Copyright and Related Rights. WIPO
$q9t8u7oyg$, 3, true, 'cur-grp-c07', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-17-a', 'cur-17', '/api/tattoo/curriculum-image/cur-17-a', 'curriculum', $q5i8to4su$در اندازهٔ کوچک، فضای داخل حروف با گذر زمان پر می‌شود.$q5i8to4su$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-18', 'cur-mod-p3', $qofr4q0nj$مرجع، حق اثر و طرح اختصاصی$qofr4q0nj$, $quluth9a9$سطح
متوسط

خلاصه
مرجع برای فهمیدن شکل و نور است، نه برای کپی. طرح اختصاصی از ترکیب چند مرجع، طراحی خودت و نیاز مشتری ساخته می‌شود و حق صاحب اثر را محترم می‌شمارد.

هدف‌ها
- از عکس مرجع درست استفاده کنی: نور، نسبت و جزئیات.
- تفاوت الهام گرفتن و کپی کردن را بدانی.
- فرایند ساخت طرح اختصاصی و فلش را اجرا کنی.

خواندن عکس مرجع
- عکس با کیفیت و نور مشخص انتخاب کن؛ عکس تار جزئیات ساختگی می‌سازد.
- جهت نور، ارزش‌های اصلی و نسبت‌ها را از عکس بخوان.
- برای پرتره، عکس با وضوح کافی از چشم‌ها ضروری است (درس ۳۵).

حق اثر
طرح، نقاشی، عکس و خوشنویسی آثار خلاقه‌اند و معمولاً صاحب حق دارند. کپی کامل کار هنرمند دیگر، حتی اگر مشتری بخواهد، با اخلاق حرفه‌ای و در بسیاری از کشورها با قانون حق اثر در تضاد است. قانون هر کشور متفاوت است؛ اصل حرفه‌ای این است: یا اجازه بگیر، یا طرح تازه بساز.

- الهام: گرفتن ایده، سبک یا موضوع و ساختن ترکیب تازه.
- کپی: بازتولید همان اثر با تغییر جزئی.
- تاتوی خاص یک فرد دیگر را کپی نکن؛ آن تاتو بخشی از هویت اوست.

طرح اختصاصی و فلش
- طرح اختصاصی: گفت‌وگو ← چند اسکیس کوچک ← انتخاب ← طرح نهایی ← تأیید.
- فلش: طرح آمادهٔ استودیو که چند بار اجرا می‌شود؛ باید کار خود استودیو باشد.
- پیش‌نویس‌ها و منابع را در پروندهٔ طرح نگه دار.

نکته‌های کلیدی
- مرجع برای فهم، نه کپی.
- یا اجازه، یا طرح تازه.
- فلش فقط از کار خود استودیو.

هشدار
- این درس مشاورهٔ حقوقی نیست؛ برای مورد خاص با متخصص حقوقی مشورت کن.

تمرین
هدف: از سه مرجع یک طرح تازه بسازی.
وسایل: سه عکس مرجع، کاغذ
1. از هر مرجع فقط یک چیز بگیر (ژست، نور، جزئیات).
2. سه اسکیس کوچک ترکیبی بکش.
3. یکی را نهایی کن و تفاوتش با مرجع‌ها را توضیح بده.
قبول وقتی:
- طرح نهایی با هیچ‌کدام از مرجع‌ها یکی نباشد.

واژه‌ها
- فلش (Flash): طرح آمادهٔ استودیو که چند بار قابل اجراست.

منابع
- Understanding Copyright and Related Rights. WIPO
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$quluth9a9$, 4, true, 'cur-grp-c07', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-18-a', 'cur-18', '/api/tattoo/curriculum-image/cur-18-a', 'curriculum', $qzcpp9uwz$از اسکیس تا استنسیل: طرح اختصاصی همین استودیو.$qzcpp9uwz$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-19', 'cur-mod-p3', $qcd93xi0e$جای طرح روی بدن و جریان بدن$qcd93xi0e$, $q5w5nf4i7$سطح
متوسط

خلاصه
بدن صفحهٔ صاف نیست. طرح باید با جهت عضلات، انحنا و حرکت هماهنگ شود؛ هر ناحیه هم از نظر درد، ترمیم و ماندگاری رفتار خودش را دارد.

هدف‌ها
- جهت جریان طرح را برای نواحی اصلی بدن تعیین کنی.
- اثر انحنا و حرکت بر شکل طرح را پیش‌بینی کنی.
- محدودیت نواحی دشوار (دست، انگشت، پا، گردن، دنده، مفصل) را برای مشتری توضیح بدهی.

جریان بدن
- طرح‌های کشیده روی بازو و ساق در امتداد طول عضو بهتر می‌نشینند.
- مرکز طرح متقارن باید روی محور واقعی بدن (ستون مهره، خط وسط سینه) باشد؛ بدن خودش کاملاً متقارن نیست.
- طرح را در حالت ایستاده و طبیعی مشتری ببین، نه فقط در حالت خوابیده روی تخت.

انحنا و حرکت
- روی سطح استوانه‌ای (بازو، ساق) خط‌های صاف از کنار دیده خمیده می‌شوند؛ استنسیل را روی بدن بررسی کن.
- مفصل‌ها (آرنج، زانو) و ناحیه‌های پرحرکت کشش متغیر دارند؛ خط ظریف آن‌جا زودتر می‌شکند.

نواحی دشوار
- انگشت، کف و کنار دست و پا: پوست پرحرکت و پرسایش؛ رنگ زودتر می‌ریزد و ترمیم بیشتری لازم است.
- گردن، دنده، شکم، روی استخوان‌ها: معمولاً دردناک‌تر؛ کشش پوست سخت‌تر است.
- شکم و پهلو با تغییر وزن یا بارداری تغییر شکل می‌دهند.
- تجربهٔ درد فردی است؛ «نقشهٔ درد» فقط راهنمای کلی است و قول بی‌دردی نده.

نکته‌های کلیدی
- طرح در امتداد عضو.
- استنسیل روی بدن ایستاده بررسی شود.
- نواحی پرحرکت ماندگاری کمتر و ترمیم بیشتر دارند.

هشدار
- کار روی دست، گردن و صورت برای کارآموز و اولین کارها مناسب نیست.

تمرین
هدف: یک طرح را روی سه ناحیهٔ بدن جانمایی کنی.
وسایل: طرح چاپی، هم‌کلاسی (فقط با کاغذ، بدون سوزن)
1. طرح را روی ساعد، بازو و ساق بگذار و عکس بگیر.
2. برای هر ناحیه جهت جریان و مشکل احتمالی را بنویس.
3. بهترین جا را با دلیل انتخاب کن.
قبول وقتی:
- دلیل انتخاب شامل جریان بدن، ماندگاری و حرکت باشد.

واژه‌ها
- استنسیل (Stencil): کپی طرح روی پوست برای راهنمای خط.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- Tattoos: Understand risks and precautions. Mayo Clinic
$q5w5nf4i7$, 1, true, 'cur-grp-c08', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-19-a', 'cur-19', '/api/tattoo/curriculum-image/cur-19-a', 'curriculum', $qwus4mg77$جهت طرح با شکل عضو هماهنگ می‌شود.$qwus4mg77$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-20', 'cur-mod-p3', $qenpki0w8$آماده‌سازی پوست و استنسیل$qenpki0w8$, $qz388lac3$سطح
متوسط

خلاصه
استنسیل نقشهٔ خط روی پوست است. پوست باید پیش از استنسیل اصلاح و ضدعفونی شود؛ استنسیل باید تمیز، درست‌اندازه و هماهنگ با بدن باشد و پیش از شروع، مشتری آن را در آینه تأیید کند.

هدف‌ها
- مراحل آماده‌سازی پوست را به ترتیب و بهداشتی انجام بدهی.
- استنسیل تمیز و درست‌اندازه تهیه و منتقل کنی.
- تأیید نهایی مشتری را پیش از شروع بگیری.

آماده‌سازی پوست
- پوست را بررسی کن: زخم، جوش، آفتاب‌سوختگی یا ضایعه = توقف و تصمیم استاد.
- اصلاح با تیغ یک‌بارمصرف، آرام و بدون خراش؛ تیغ مستقیم به ظرف تیز.
- پاک کردن با مادهٔ ضدعفونی پوست روی گاز تمیز و صبر تا خشک شدن.

تهیهٔ استنسیل
- طرح را در اندازهٔ واقعی چاپ کن و روی بدن بسنج.
- فقط خط‌های لازم برای اجرا را منتقل کن؛ سایه‌ها با چند خط راهنما.
- کاغذ استنسیل و مادهٔ انتقال یک‌بارمصرف یا مخصوص همان مشتری؛ ظرف مادهٔ انتقال با دست آلوده لمس نشود.

انتقال و تأیید
- مشتری در حالت طبیعی (ایستاده یا نشسته) باشد تا طرح روی بدن واقعی درست بنشیند.
- کاغذ را بدون لغزش بگذار و صاف بردار.
- بگذار استنسیل چند دقیقه خشک شود.
- مشتری در آینه جا، اندازه و جهت را ببیند و تأیید کند. استنسیل کج را دوباره بزن؛ «وسط کار درستش می‌کنم» خطاست.

نکته‌های کلیدی
- اصلاح و ضدعفونی پیش از استنسیل.
- استنسیل روی بدن در حالت طبیعی.
- تأیید مشتری در آینه پیش از سوزن.

هشدار
- پس از استنسیل، شستن زیاد طرح را پاک می‌کند؛ پس ضدعفونی باید پیش از آن کامل باشد.

تمرین
هدف: یک استنسیل تمیز روی پوست مصنوعی منحنی منتقل کنی.
وسایل: پوست مصنوعی روی استوانه، کاغذ استنسیل، چاپگر یا قلم
1. طرح را در اندازهٔ درست آماده کن.
2. روی سطح منحنی منتقل کن.
3. از سه زاویه عکس بگیر و کجی را بررسی کن.
قبول وقتی:
- خط‌ها بدون لک و لغزش و طرح در محور درست باشد.

واژه‌ها
- استنسیل (Stencil): کپی طرح روی پوست برای راهنمای خط.
- آلودگی متقاطع (Cross-contamination): انتقال آلودگی از وسیله، سطح یا دست آلوده به چیز تمیز یا به فرد دیگر.

منابع
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qz388lac3$, 2, true, 'cur-grp-c08', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-20-a', 'cur-20', '/api/tattoo/curriculum-image/cur-20-a', 'curriculum', $qjgjkfca5$از بررسی پوست تا تأیید مشتری.$qjgjkfca5$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-21', 'cur-mod-p4', $qy06p4nic$مشاوره، رضایت‌نامه و فهرست توقف$qy06p4nic$, $q44lxwnmv$سطح
متوسط

خلاصه
پیش از هر کار، گفت‌وگوی ساختارمند با مشتری انجام می‌شود: طرح، جا، اندازه، سلامت، خطرها و مراقبت. نتیجه در رضایت‌نامهٔ کتبی ثبت می‌شود و اگر موردی از فهرست توقف وجود داشت، کار عقب می‌افتد یا به نظر پزشک وابسته می‌شود.

هدف‌ها
- یک مشاورهٔ کامل را با فرم استاندارد انجام بدهی.
- موارد توقف و احتیاط را بشناسی و بدون تشخیص پزشکی، ارجاع بدهی.
- رضایت‌نامهٔ آگاهانه را درست تکمیل کنی.

گفت‌وگوی مشاوره
- ایده، معنا، سبک، اندازه، جای بدن و بودجه.
- محدودیت فنی: نوشتهٔ خیلی ریز، رنگ روشن روی پوست تیره، جای پرسایش.
- تعداد و طول جلسه‌ها، مراقبت و زمان ترمیم.
- سن و مدرک هویت طبق قانون محل.

پرسش‌های سلامت (برای ایمنی، نه تشخیص)
طبق مرور علمی کلوگر (۲۰۱۵) منع مطلق برای تاتو کم است، ولی در چند وضعیت فرد باید پیش از تاتو با پزشک مشورت کند. کار تو پرسیدن، ثبت و ارجاع است.

- بیماری پوستی فعال در محل (مثل پسوریازیس، اگزما، ویتیلیگو): خطر ظاهر شدن بیماری روی تاتو (پدیدهٔ کوبنر)؛ کار تا آرام شدن پوست و نظر پزشک عقب می‌افتد.
- اختلال انعقاد خون یا مصرف داروی ضدانعقاد.
- دیابت کنترل‌نشده، بیماری یا داروی سرکوب‌کنندهٔ ایمنی، بیماری مادرزادی قلب.
- بارداری و شیردهی: معمولاً کار به بعد موکول می‌شود.
- سابقهٔ کلوئید، حساسیت به رنگ، لاتکس، چسب یا مادهٔ ضدعفونی.
- خال یا ضایعهٔ تغییرکرده در محل طرح.

فهرست توقف همان روز
- مستی یا مصرف مواد.
- تب، بیماری حاد یا عفونت فعال.
- پوست زخمی، آفتاب‌سوخته یا ملتهب در محل.
- مشتری مردد یا تحت فشار دیگران.
- هر پاسخ سلامت که استاد هنوز بررسی نکرده است.

رضایت‌نامه
- طرح نهایی، جا، اندازه و رنگ‌ها.
- خطرهای اصلی (عفونت، حساسیت، جوشگاه، تغییر رنگ) و دستور مراقبت.
- پرسش‌های سلامت با پاسخ‌های مشتری.
- رضایت عکاسی (جداگانه).
- امضا و تاریخ؛ نگهداری محرمانه طبق قانون محل.

نکته‌های کلیدی
- پرسیدن و ثبت، نه تشخیص.
- مورد مشکوک = مشورت پزشک پیش از کار.
- رضایت‌نامهٔ کتبی پیش از استنسیل.

هشدار
- هرگز به مشتری نگو «این بیماری مشکلی ندارد»؛ این قضاوت پزشکی است.
- کارآموز روی پوست مشتری تاتو نمی‌زند؛ همهٔ تمرین‌ها روی کاغذ، پوست مصنوعی یا میوه انجام می‌شود.

تمرین
هدف: یک مشاورهٔ کامل نقش‌آفرینی و فرم را پر کنی.
وسایل: فرم مشاوره و رضایت‌نامه
1. با هم‌کلاسی در نقش مشتری مشاوره کن.
2. استاد یک مورد احتیاط پنهان در نقش قرار می‌دهد؛ آن را پیدا کن.
3. تصمیم و ارجاع را ثبت کن.
قبول وقتی:
- مورد احتیاط پیدا و بدون تشخیص پزشکی ارجاع شود.
- همهٔ بخش‌های فرم کامل باشد.

واژه‌ها
- رضایت‌نامهٔ آگاهانه (Informed consent): تأیید کتبی مشتری پس از دانستن طرح، خطر، مراقبت و هزینه.
- موارد توقف و احتیاط (Contraindication): وضعیتی که کار باید عقب بیفتد یا به نظر پزشک وابسته شود.
- پدیدهٔ کوبنر (Koebner phenomenon): ظاهر شدن بیماری پوستی (مثل پسوریازیس) روی جای آسیب یا تاتو.
- کلوئید (Keloid): جوشگاه برجسته‌ای که از حد زخم بیرون می‌زند.

منابع
- Kluger N. Contraindications for tattooing. Karger — Curr Probl Dermatol 2015;48:76-87 (Tattooed Skin and Health)
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
- Tattoos: Understand risks and precautions. Mayo Clinic
- Do tattoos cause skin cancer?. American Academy of Dermatology
$q44lxwnmv$, 1, true, 'cur-grp-c09', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-21-a', 'cur-21', '/api/tattoo/curriculum-image/cur-21-a', 'curriculum', $qqtidz8i4$پرسش، ثبت، ارجاع؛ کار فقط پس از رضایت‌نامه.$qqtidz8i4$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-22', 'cur-mod-p4', $qd8rlp9g0$روز جلسه: آمادگی مشتری، غذا، الکل، بی‌حسی و غش$qd8rlp9g0$, $q1fo6b9rx$سطح
متوسط

خلاصه
آمادگی مشتری روی درد، خونریزی، ترمیم و ایمنی جلسه اثر دارد. این درس برگهٔ آمادگی استودیو، قواعد بی‌حسی و اقدام در غش را یکجا می‌آورد.

هدف‌ها
- برگهٔ آمادگی پیش از جلسه را برای مشتری توضیح بدهی.
- قواعد استفاده از بی‌حسی موضعی را بدانی.
- نشانه‌های پیش از غش را بشناسی و اقدام درست انجام بدهی.

برگهٔ آمادگی استودیو
- از دو روز قبل آب کافی بنوشد؛ پوست خشک را شب‌ها با کرم بدون عطر نرم کند، ولی صبح جلسه روی پوست کرم نباشد.
- آفتاب و سولاریوم نرود؛ پوست سوخته یا پوسته‌دار کار نمی‌شود.
- از ۲۴ ساعت قبل الکل ننوشد؛ همان روز قهوه و نوشابهٔ گازدار زیاد نخورد.
- شب قبل زود و کافی (حدود ۸ ساعت) بخوابد.
- محل را خودش نتراشد.
- یک تا دو ساعت قبل غذای سبک بخورد و خوراکی همراه بیاورد.
- داروی تجویزی، از جمله داروهای مؤثر بر انعقاد خون، را خودسر قطع یا شروع نکند؛ اگر چنین دارویی مصرف می‌کند، پیش از نوبت با پزشک خودش هماهنگ کند و به استودیو اطلاع دهد.
- لباس آزاد بپوشد و سر وقت بیاید.

بی‌حسی موضعی
- قانون فروش و استفادهٔ کرم‌های بی‌حسی در کشورها متفاوت است؛ اگر در محل تو مجاز نیست، استفاده نکن.
- بی‌حسی را تو تجویز نمی‌کنی؛ اگر مشتری خودش چیزی زده، نام و زمان آن را بپرس و ثبت کن.
- مصرف زیاد روی سطح بزرگ یا زیر پوشش طولانی جذب را بیشتر و خطر را زیاد می‌کند.
- پوست بی‌حس درد را که علامت ضربهٔ زیاد است پنهان می‌کند؛ عمق را با چشم و نتیجه کنترل کن.

غش (واکنش وازوواگال)
درد، ترس، گرسنگی و ایستادن طولانی می‌توانند با افت ناگهانی ضربان و فشار به غش برسند. این واکنش معمولاً گذراست ولی افتادن می‌تواند آسیب بزند.

- نشانه‌های پیش از غش: رنگ‌پریدگی، عرق سرد، تهوع، خمیازه، سیاهی رفتن چشم، گفتن «حالم بد است».
- اقدام: کار را فوراً قطع کن، دستگاه را کنار بگذار، مشتری را بخوابان و در صورت امکان پاهایش را بالا بگذار؛ اطراف را از وسایل تیز خالی کن.
- پس از به‌هوش آمدن کامل، آب یا نوشیدنی شیرین بدهد؛ کار را فقط اگر حالش کاملاً خوب است و با تصمیم استاد ادامه بده.
- اگر بیهوشی بیش از چند لحظه طول کشید، تشنج، درد قفسهٔ سینه، تنگی نفس یا آسیب سر رخ داد، با اورژانس تماس بگیر.

نکته‌های کلیدی
- غذا بله، الکل نه.
- داروی تجویزی خودسر قطع نشود؛ هماهنگی با پزشک.
- نشانهٔ غش = توقف فوری و خواباندن.

هشدار
- کارآموز دارو و بی‌حسی تجویز نمی‌کند.
- نشانه‌های حساسیت شدید (تنگی نفس، تورم صورت یا گلو، کهیر گسترده) = تماس فوری با اورژانس.

تمرین
هدف: برگهٔ آمادگی را توضیح بدهی و سناریوی غش را اجرا کنی.
وسایل: برگهٔ آمادگی، تخت
1. برگه را در دو دقیقه برای مشتری فرضی توضیح بده.
2. سناریوی «مشتری رنگش پرید» را اجرا کن.
3. معیار تماس با اورژانس را بگو.
قبول وقتی:
- کار در کمتر از چند ثانیه متوقف و مشتری خوابانده شود.
- هیچ توصیهٔ دارویی داده نشود.

واژه‌ها
- غش وازوواگال (Vasovagal episode): افت ناگهانی فشار و ضربان در اثر درد، ترس یا گرسنگی که به سیاهی رفتن چشم یا غش می‌رسد.
- موارد توقف و احتیاط (Contraindication): وضعیتی که کار باید عقب بیفتد یا به نظر پزشک وابسته شود.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- Vasovagal Episode. StatPearls / NCBI Bookshelf
- Tattoos: Understand risks and precautions. Mayo Clinic
$q1fo6b9rx$, 2, true, 'cur-grp-c09', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-22-a', 'cur-22', '/api/tattoo/curriculum-image/cur-22-a', 'curriculum', $qn26xici9$نشانهٔ غش را جدی بگیر: توقف، خواباندن، پاها بالا. معیارهای اورژانس طبق NHS است؛ ردیف «حساسیت شدید» قاعدهٔ کلاس است، نه NHS.$qn26xici9$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-22-x1-prep-sheet', 'cur-22', '/api/tattoo/curriculum-image/cur-22-x1-prep-sheet', 'curriculum', $qyc23nku9$غذا بله، الکل نه؛ داروی تجویزی خودسر قطع نشود.$qyc23nku9$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-23', 'cur-mod-p4', $qmpdayqmo$نشست، کشش پوست، زاویه و عمق$qmpdayqmo$, $qooi4ch5m$سطح
متوسط

خلاصه
خط خوب از بدن آرام، پوست کشیده، زاویهٔ پایدار و عمق درست می‌آید. عمق با خواندن نتیجه تنظیم می‌شود، نه با حفظ یک عدد.

هدف‌ها
- نشست و تکیه‌گاه دست را درست تنظیم کنی.
- پوست را با دست غیرکاری یکنواخت بکشی.
- زاویهٔ ورود و بیرون‌زدگی سوزن را روی پوست مصنوعی تنظیم و نتیجه را بخوانی.

نشست و تکیه‌گاه
- ارتفاع تخت و صندلی طوری که شانه بالا نرود و کمر خم نشود.
- انگشت کوچک یا لبهٔ دست کاری روی پوست یا تکیه‌گاه تکیه کند تا دست نلرزد.
- مشتری در وضعیت پایدار و راحت؛ عضوی که مدام حرکت می‌کند خط را خراب می‌کند.

کشش پوست
پوست شل زیر سوزن موج برمی‌دارد و عمق یکی در میان می‌شود. با دست غیرکاری (و در صورت نیاز کمک دستیار) پوست را در دو جهت صاف کن؛ کشش زیاد هم طرح را پس از رها شدن تغییر شکل می‌دهد.

زاویه
- در خط، سوزن معمولاً نزدیک به عمود تا کمی مایل وارد می‌شود؛ دستگاه را مثل خودکار خوابیده نگیر.
- در سایه با مگنوم، زاویهٔ مایل‌تر رایج است.
- زاویه در طول یک خط ثابت بماند؛ تغییر زاویه وسط خط ضخامت را تغییر می‌دهد.

بیرون‌زدگی سوزن و عمق
- بیرون‌زدگی نوک سوزن از سر کارتریج یا تیوب، در خط معمولاً کم است؛ عدد دقیق به دستگاه و کارتریج بستگی دارد و روی پوست مصنوعی تنظیم می‌شود.
- نشانهٔ عمق درست: خط پس از پاک کردن پیوسته و تیز می‌ماند و بلوآوت ندارد.
- خیلی سطحی: پس از پاک کردن خط کم‌رنگ یا بریده است.
- خیلی عمیق: خونریزی زیاد، پوست جویده یا هالهٔ آبی دور خط.

نکته‌های کلیدی
- تکیه‌گاه دست، کشش یکنواخت.
- زاویهٔ ثابت در طول خط.
- عمق را از نتیجه بخوان.

هشدار
- فشار دادن دستگاه به پوست جایگزین سوزن تیز و پوست کشیده نیست.

تمرین
هدف: اثر کشش و زاویه را با چشم ببینی.
وسایل: پوست مصنوعی شل‌شونده (روی فوم)، لاینر
1. سه خط بدون کشش، با کشش کم و با کشش درست بزن.
2. سه خط با زاویهٔ خوابیده، مایل و عمود بزن.
3. نتیجه را عکس بگیر و توضیح بده.
قبول وقتی:
- بهترین خط از نظر پیوستگی و تیزی انتخاب و دلیلش گفته شود.

واژه‌ها
- بیرون‌زدگی سوزن (Needle hang / give): مقدار بیرون‌آمدن نوک سوزن از سر کارتریج یا تیوب.
- بلوآوت (پخش‌شدگی رنگ) (Blowout): هالهٔ آبی‌خاکستری دور خط، معمولاً از ورود رنگ به عمق نادرست یا کشش و زاویهٔ غلط.
- میان‌پوست (Dermis): لایهٔ زیر روپوست، از بافت همبند؛ جای ماندگار رنگ تاتو.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- Anatomy, Skin (Integument). StatPearls / NCBI Bookshelf
$qooi4ch5m$, 1, true, 'cur-grp-c10', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-23-a', 'cur-23', '/api/tattoo/curriculum-image/cur-23-a', 'curriculum', $qrdg6majr$کشش یکنواخت و زاویهٔ ثابت.$qrdg6majr$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-23-b', 'cur-23', '/api/tattoo/curriculum-image/cur-23-b', 'curriculum', $qiusf6tt0$کشش درست با دست غیرکاری.$qiusf6tt0$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-23-x1-depth-comparison', 'cur-23', '/api/tattoo/curriculum-image/cur-23-x1-depth-comparison', 'curriculum', $qrbn3x7vd$خیلی سطحی: خط کم‌رنگ و بریده؛ خیلی عمیق: هالهٔ آبی دور خط.$qrbn3x7vd$, 3)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-24', 'cur-mod-p4', $qi9zy63ts$پوست خسته، بلوآوت و قضاوت حین کار$qi9zy63ts$, $qym87seng$سطح
متوسط

خلاصه
پوست ظرفیت محدودی دارد. با عبور زیاد، ضربهٔ سنگین یا جلسهٔ طولانی ملتهب می‌شود، رنگ را پس می‌زند و ترمیمش سخت می‌شود. تشخیص لحظهٔ توقف مهارت حرفه‌ای است.

هدف‌ها
- نشانه‌های پوست خسته و ملتهب را بشناسی.
- علت‌های بلوآوت را بدانی و از آن پیشگیری کنی.
- پاک کردن درست حین کار و قضاوت دربارهٔ ادامه یا توقف را انجام بدهی.

پوست خسته
- نشانه‌ها: تورم، سفتی، براق شدن، ترشح زیاد، رنگی که دیگر نمی‌نشیند و با دستمال می‌آید.
- علت‌ها: چند بار رد شدن روی یک ناحیه، سوزن کلفت با دست کند، ضربهٔ بیش از حد، جلسهٔ خیلی طولانی.
- پاسخ: کار را در آن ناحیه متوقف کن و ادامه را به جلسهٔ بعد بسپار؛ محکم‌تر کار کردن پاسخ نیست.

بلوآوت
- علت‌های رایج: عمق زیاد، زاویهٔ خیلی خوابیده، پوست شل، پوست نازک.
- بلوآوت را با سوزن بیشتر درست نکن؛ گاهی با طراحی (خط ضخیم‌تر یا سایه) پنهان‌کردنی است و تصمیمش با استاد است.

پاک کردن حین کار
- با دستمال تمیز و ضربه‌ای ملایم پاک کن، نه مالش محکم که استنسیل را پاک و پوست را تحریک کند.
- جهت پاک کردن طوری باشد که دستمال روی خط‌های تازه و استنسیل اجرا نشده کشیده نشود.
- لایهٔ ضخیم وازلین یا مادهٔ لغزنده سوزن را لیز و دید را کم می‌کند؛ لایه نازک باشد.

نکته‌های کلیدی
- پوست خسته رنگ نمی‌گیرد؛ توقف.
- بلوآوت با سوزن بیشتر درست نمی‌شود.
- پاک کردن ضربه‌ای و نازک.

هشدار
- الکل روی زخم باز ریخته نمی‌شود.
- قرمزی رو به افزایش، ترشح بدبو یا تب پس از جلسه، ارجاع به پزشک است (درس ۳۱).

تمرین
هدف: اثر عبور زیاد را روی پوست مصنوعی ببینی و قضاوت کنی.
وسایل: پوست مصنوعی، شیدر
1. یک مربع را با یک عبور و مربع دیگر را با پنج عبور پر کن.
2. سطح و لبه‌ها را مقایسه کن.
3. یک برنامهٔ دوجلسه‌ای برای یک کار بزرگ بنویس.
قبول وقتی:
- آسیب عبور زیاد در عکس دیده و توضیح داده شود.

واژه‌ها
- بلوآوت (پخش‌شدگی رنگ) (Blowout): هالهٔ آبی‌خاکستری دور خط، معمولاً از ورود رنگ به عمق نادرست یا کشش و زاویهٔ غلط.
- اشباع (Saturation / packing): پر شدن یکدست رنگ در میان‌پوست بدون جای خالی.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- Tattoos: 7 unexpected skin reactions and what to do about them. American Academy of Dermatology
$qym87seng$, 2, true, 'cur-grp-c10', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-24-a', 'cur-24', '/api/tattoo/curriculum-image/cur-24-a', 'curriculum', $qi1h7r5eg$بلوآوت: رنگ در لایهٔ چربی پخش می‌شود.$qi1h7r5eg$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-24-x1-tired-skin', 'cur-24', '/api/tattoo/curriculum-image/cur-24-x1-tired-skin', 'curriculum', $qqmcflks3$پوست خسته رنگ نمی‌گیرد؛ توقف.$qqmcflks3$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-25', 'cur-mod-p4', $qpstcs85q$خط‌کشی: خط یک‌عبوره، ضخامت و بستن شکل$qpstcs85q$, $qgflx9qzz$سطح
متوسط

خلاصه
خط اسکلت تاتوست. هدف خطی پیوسته، یکنواخت و تیز با یک عبور است؛ ضخامت با انتخاب سوزن تعیین می‌شود، نه با چند بار رد شدن.

هدف‌ها
- خط مستقیم، منحنی و دایره را با یک عبور بزنی.
- ضخامت خط را با انتخاب سوزن کنترل کنی.
- شکل‌ها را بدون پله و هم‌پوشانی ببندی.

خط یک‌عبوره
- دستگاه را پیش از تماس با پوست روشن کن و حرکت را بلافاصله پس از ورود شروع کن.
- سرعت یکنواخت از ابتدا تا انتها؛ در انتها هم‌زمان با ادامهٔ حرکت دست را بالا بیاور.
- خط بلند را در چند تکهٔ کوتاه‌تر با اتصال نامرئی بزن، نه با یک حرکت لرزان.

ضخامت
- خط ضخیم‌تر = لاینر بزرگ‌تر (مثلاً ۹ یا ۱۱)، نه چند عبور با لاینر کوچک.
- سلسله‌مراتب: دور شکل اصلی ضخیم‌تر، جزئیات داخلی نازک‌تر.

بستن شکل و ترتیب
- اتصال‌ها را در جای پنهان (گوشه یا پشت شکل دیگر) بگذار.
- معمولاً خط‌ها از پایین به بالا یا از سمتی اجرا می‌شوند که دست و دستمال روی استنسیل اجرا نشده کشیده نشود.
- پیش از سایه، همهٔ خط‌ها کامل و بررسی شوند.

نکته‌های کلیدی
- یک عبور، سرعت یکنواخت.
- ضخامت از سوزن، نه از تکرار.
- اتصال‌ها در جای پنهان.

هشدار
- رد شدن مکرر روی خط برای پهن کردن، بلوآوت و التهاب می‌آورد.

تمرین
هدف: صفحهٔ آزمون خط را با کیفیت قبولی اجرا کنی.
وسایل: پوست مصنوعی، لاینر ۵ و ۹
1. ده خط مستقیم ۵ سانتی، ده منحنی S و ده دایره.
2. یک شکل ستاره با اتصال‌های پنهان.
3. همان شکل با دو ضخامت.
قبول وقتی:
- دست‌کم ۸۰٪ خط‌ها پیوسته و بدون لرزش باشند.
- اتصال‌ها پله نداشته باشند.

واژه‌ها
- لاینر گرد (Round Liner, RL): سوزن‌هایی که در دایره‌ای فشرده لحیم شده‌اند؛ برای خط.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qgflx9qzz$, 1, true, 'cur-grp-c11', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-25-a', 'cur-25', '/api/tattoo/curriculum-image/cur-25-a', 'curriculum', $qlvqqj93z$خط یک‌عبوره و اتصال پنهان.$qlvqqj93z$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-26', 'cur-mod-p4', $q00c3vmo3$سایه‌زنی: شلاقی، پاندولی، یکنواخت و نقطه‌ای$q00c3vmo3$, $qz82gujfp$سطح
متوسط

خلاصه
سایه گذار ارزش رنگی روی پوست است. حرکت دست (شلاقی، پاندولی، دایره‌های کوچک) و تراکم نقطه‌ها شدت سایه را می‌سازد. گرادیان نرم با چند لایهٔ سبک ساخته می‌شود، نه یک عبور سنگین.

هدف‌ها
- سایهٔ شلاقی و پاندولی را از هم تشخیص و اجرا کنی.
- گرادیان سه‌پله‌ای روی پوست مصنوعی بسازی.
- سایهٔ نقطه‌ای (فلفلی و نقطه‌گذاری) را کنترل کنی.

شلاقی (Whip)
حرکت قوسی کوتاه که در ابتدا عمیق‌تر است و با بالا آمدن دست در انتها سبک می‌شود؛ سمت شروع تیره و انتها نقطه‌ای و روشن است. برای سایهٔ نرم و بافت‌دار و کار با لاینر یا شیدر کوچک.

پاندولی (Pendulum)
تاب خوردن مچ به چپ و راست مانند آونگ، با مگنوم؛ جایی که مکث بیشتری داری تیره‌تر می‌شود. برای گرادیان در سطح بزرگ‌تر.

یکنواخت و گرادیان
- سایهٔ یکنواخت با دایره‌های کوچک هم‌پوشان یا حرکت رفت‌وبرگشتی کنترل‌شده.
- گرادیان: از تیره شروع کن و با کم کردن مکث و تراکم به سمت روشن برو؛ لایه‌ها سبک باشند.
- جهت حرکت سایه از شکل حجم پیروی کند.

نقطه‌ای
- فلفلی (Pepper): ضربه‌های پراکنده با دست تندتر یا ولتاژ پایین‌تر که بافت نقطه‌ای و دانه‌دار می‌سازد.
- نقطه‌گذاری: نقطه‌های جدا و کنترل‌شده؛ تراکم بیشتر = تیره‌تر. حوصله و ثبات دست می‌خواهد.
- نقطه‌ها با گذر زمان کمی پخش می‌شوند؛ فاصلهٔ خیلی کم در طرح ریز یکی می‌شود.

نکته‌های کلیدی
- شلاقی: قوس با انتهای سبک.
- پاندولی: تاب مچ با مگنوم.
- گرادیان با لایه‌های سبک.

هشدار
- یک عبور سنگین برای «زود تمام کردن» سایه، پوست را خسته و سایه را لک‌دار می‌کند.

تمرین
هدف: نوار گرادیان و کرهٔ سایه‌دار روی پوست مصنوعی.
وسایل: پوست مصنوعی، مگنوم خمیده، شیدر، رنگ مشکی و کاپ رقیق
1. یک نوار ۸ سانتی گرادیان با پاندولی.
2. یک نوار با شلاقی.
3. یک کرهٔ نقطه‌ای.
قبول وقتی:
- گرادیان بدون پله و لک باشد.
- تفاوت بافت دو روش دیده شود.

واژه‌ها
- سایهٔ شلاقی (Whip shading): سایه با حرکت قوسی و بلندشدن دست در انتهای ضربه؛ ته‌رنگ نقطه‌ای و نرم.
- سایهٔ پاندولی (Pendulum shading): سایه با تاب‌خوردن مچ به چپ و راست برای گرادیان.
- نقطه‌گذاری (Stippling / dotwork): ساختن سایه با تراکم نقطه.
- مگنوم بافته (Weaved Magnum, M1): دو ردیف سوزن درهم؛ برای پرکردن و سایهٔ سطح بزرگ. با فلت (یک ردیف صاف) فرق دارد.
- مگنوم خمیده (Curved Magnum, CM/RM): مگنوم با لبهٔ قوسی؛ لبهٔ نرم‌تر و سایهٔ یکدست‌تر روی انحنا.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qz82gujfp$, 2, true, 'cur-grp-c11', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-26-a', 'cur-26', '/api/tattoo/curriculum-image/cur-26-a', 'curriculum', $q37mgsnj8$حرکت دست، بافت سایه را می‌سازد.$q37mgsnj8$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-27', 'cur-mod-p4', $qftgdb6l7$پر کردن رنگ، اشباع و مرز رنگ‌ها$qftgdb6l7$, $qagcacdqe$سطح
متوسط

خلاصه
رنگ یکدست و اشباع از حرکت منظم با مگنوم یا شیدر، سرعت دست کنترل‌شده و ترتیب درست رنگ‌ها می‌آید. مرز دو رنگ تمیز است اگر رنگ تیره‌تر اول و روشن‌تر بعد اجرا شود.

هدف‌ها
- سطح را یکدست و بدون جای خالی پر کنی.
- ترتیب اجرای رنگ‌ها و تعویض کارتریج را رعایت کنی.
- مرز و ترکیب دو رنگ را تمیز بسازی.

اشباع
- حرکت دایره‌ای کوچک یا رفت‌وبرگشتی کوتاه با هم‌پوشانی.
- سرعت دست آهسته‌تر از خط ولی بدون ماندن روی یک نقطه.
- یک لایهٔ کامل بهتر از چند لایهٔ ناقص؛ عبور بیش از حد پوست را خسته می‌کند (درس ۲۴).

ترتیب رنگ‌ها
- معمولاً از تیره به روشن؛ رنگ روشن دیرتر تا آلوده به تیره نشود.
- سفید و هایلایت در پایان.
- بین رنگ‌ها کارتریج را شست‌وشو بده یا عوض کن؛ کارتریج آلوده به رنگ تیره، رنگ روشن را کدر می‌کند.

مرز و ترکیب
- مرز تیز: رنگ دوم تا لبهٔ رنگ اول بیاید و کمی روی آن.
- ترکیب نرم: در ناحیهٔ مرز، هر دو رنگ با تراکم کاهنده هم‌پوشانی داشته باشند.
- ترکیب رنگ‌های مکمل کدر می‌شود؛ ترکیب را روی پوست مصنوعی امتحان کن.

نکته‌های کلیدی
- تیره به روشن.
- یک لایهٔ کامل.
- کارتریج تمیز برای رنگ روشن.

هشدار
- رنگ کاپ‌ها برای هر مشتری جداست و باقی‌مانده دور ریخته می‌شود.

تمرین
هدف: یک مربع تک‌رنگ اشباع و یک مرز دورنگ بسازی.
وسایل: پوست مصنوعی، مگنوم، دو رنگ
1. مربع ۴×۴ را یکدست پر کن.
2. دو مربع کنار هم با مرز تیز.
3. دو مربع با ترکیب نرم.
قبول وقتی:
- بدون جای خالی و بدون لبهٔ کثیف.

واژه‌ها
- اشباع (Saturation / packing): پر شدن یکدست رنگ در میان‌پوست بدون جای خالی.
- مگنوم بافته (Weaved Magnum, M1): دو ردیف سوزن درهم؛ برای پرکردن و سایهٔ سطح بزرگ. با فلت (یک ردیف صاف) فرق دارد.
- مگنوم خمیده (Curved Magnum, CM/RM): مگنوم با لبهٔ قوسی؛ لبهٔ نرم‌تر و سایهٔ یکدست‌تر روی انحنا.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qagcacdqe$, 3, true, 'cur-grp-c11', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-27-a', 'cur-27', '/api/tattoo/curriculum-image/cur-27-a', 'curriculum', $qlrz8hmri$تیره اول، روشن بعد، سفید آخر.$qlrz8hmri$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-28', 'cur-mod-p4', $qgrd5n98m$سیاه و خاکستری: کاپ‌های رقیق، محو، فضای منفی و هایلایت$qgrd5n98m$, $qam0yn961$سطح
متوسط

خلاصه
در کار سیاه و خاکستری، ارزش‌ها با رقیق کردن مشکی در چند کاپ ساخته می‌شوند. لبه‌های محو، فضای منفی (پوست خالی) و هایلایت کنترل‌شده، حجم و نور را می‌سازند.

هدف‌ها
- سری کاپ‌های خاکستری رقیق را بسازی و برچسب بزنی.
- لبهٔ محو در پوست و فضای منفی را طراحی و اجرا کنی.
- هایلایت سفید را محدود و درست به کار ببری.

کاپ‌های رقیق
- از رقیق‌کنندهٔ توصیه‌شدهٔ سازنده یا آب استریل استفاده کن.
- سه تا پنج کاپ از روشن به تیره؛ نسبت‌ها را بنویس تا قابل تکرار باشد.
- از روشن‌ترین کاپ شروع کن و تیره را به‌تدریج بساز؛ تیره کردن آسان‌تر از روشن کردن است.
- برخی سازندگان سری خاکستری آماده دارند؛ یکنواختی بیشتری می‌دهد.

محو در پوست و فضای منفی
- لبهٔ محو با کم کردن تراکم و فشار در انتهای حرکت شلاقی یا پاندولی ساخته می‌شود.
- پوست خالی روشن‌ترین ارزش طرح است؛ آن را در طراحی برنامه‌ریزی کن، نه اینکه بعداً با سفید پر کنی.

هایلایت سفید
- سفید در پایان و فقط روی نقاط کوچک بیشترین نور.
- سفید روی پوست زودتر از بقیه محو یا زرد می‌شود؛ ماندگاری را به آن نسپار.

نکته‌های کلیدی
- از روشن به تیره.
- پوست خالی = روشن‌ترین ارزش.
- سفید فقط برای نقطهٔ نور.

هشدار
- آب لوله‌کشی برای رقیق کردن ممنوع است.

تمرین
هدف: یک کرهٔ سیاه و خاکستری با سه کاپ و فضای منفی.
وسایل: پوست مصنوعی، مگنوم خمیده، رقیق‌کننده، سه کاپ
1. سه کاپ با نسبت ثبت‌شده بساز.
2. کره را از روشن به تیره اجرا کن.
3. یک هایلایت کوچک سفید اضافه کن.
قبول وقتی:
- سه ارزش جدا دیده شوند و لبهٔ محو بدون پله باشد.

واژه‌ها
- کاپ‌های رقیق خاکستری (Grey wash): رقیق کردن مشکی برای ساختن چند ارزش خاکستری.
- ارزش رنگی (روشنی و تیرگی) (Value): میزان روشنی یا تیرگی یک رنگ، مستقل از فام.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qam0yn961$, 4, true, 'cur-grp-c11', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-28-a', 'cur-28', '/api/tattoo/curriculum-image/cur-28-a', 'curriculum', $qryoj399x$سری کاپ‌های خاکستری؛ نسبت‌ها را ثبت کن.$qryoj399x$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-29', 'cur-mod-p4', $qw2dp2mx6$ترتیب اجرا و اصلاح خطا در همان جلسه$qw2dp2mx6$, $qzrug94bk$سطح
متوسط

خلاصه
ترتیب اجرا جلوی پاک شدن استنسیل، آلوده شدن رنگ‌ها و خستگی پوست را می‌گیرد. خطای حین کار با آرامش و اغلب با طراحی اصلاح می‌شود، نه با کوبیدن بیشتر پوست.

هدف‌ها
- ترتیب استاندارد اجرای یک طرح را بدانی.
- خطاهای رایج حین کار را تشخیص بدهی.
- راه اصلاح هر خطا یا تصمیم به توقف را انتخاب کنی.

ترتیب رایج
- خط اصلی (از پایین یا از سمتی که دست روی استنسیل نکشد).
- سایهٔ تیره و مشکی.
- خاکستری‌ها یا رنگ‌ها از تیره به روشن.
- هایلایت سفید.
- پاک کردن نهایی، عکس و پوشش.

خطاهای رایج و پاسخ
- خط لرزان یا کج: اگر کوچک است، با ضخیم‌تر کردن یکدست خط یا سایه اصلاح؛ اگر بزرگ است، توقف و مشورت با استاد.
- استنسیل پاک‌شده: با قلم پوستی تمیز دوباره بکش، نه حدسی.
- رنگ اشتباه: روی رنگ روشن، رنگ تیره‌تر ممکن است؛ برعکس معمولاً نه.
- پوست خسته: توقف در آن ناحیه (درس ۲۴).

صداقت با مشتری
خطا را پنهان نکن. توضیح بده چه شده و راه‌حل چیست؛ تصمیم دربارهٔ تغییر طرح با رضایت مشتری است.

نکته‌های کلیدی
- خط ← تیره ← روشن ← سفید.
- اصلاح با طراحی، نه با فشار.
- صداقت دربارهٔ خطا.

هشدار
- اصلاح بزرگ وسط جلسه بدون نظر استاد ممنوع.

تمرین
هدف: یک طرح کامل کوچک را با ترتیب درست اجرا کنی.
وسایل: پوست مصنوعی، طرح کوچک خط و سایه
1. ترتیب را پیش از شروع بنویس.
2. اجرا کن؛ استاد یک خطای عمدی (مثلاً پاک شدن استنسیل) ایجاد می‌کند.
3. اصلاح را انجام و ثبت کن.
قبول وقتی:
- ترتیب رعایت و خطا بدون آسیب اضافه اصلاح شود.

واژه‌ها
- استنسیل (Stencil): کپی طرح روی پوست برای راهنمای خط.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qzrug94bk$, 5, true, 'cur-grp-c11', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-29-a', 'cur-29', '/api/tattoo/curriculum-image/cur-29-a', 'curriculum', $qfwbs9rbh$ترتیب اجرا جلوی خطا را می‌گیرد.$qfwbs9rbh$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-30', 'cur-mod-p4', $qjc7evap1$مراقبت بعد از تاتو: روش استودیو$qjc7evap1$, $qzlrgskqn$سطح
مبتدی

خلاصه
مشتری فقط یک دستور مراقبت می‌گیرد: برگهٔ همین استودیو، کتبی. کارآموز آن را دقیق و بدون افزودن روش‌های دیگر توضیح می‌دهد.

هدف‌ها
- روش مراقبت استودیو را کامل و به ترتیب توضیح بدهی.
- نکته‌های عمومی پرهیز را بگویی.
- مرز پوستهٔ طبیعی و نشانهٔ هشدار را به مشتری بفهمانی.

روش این استودیو
این زمان‌ها روی کاغذ به مشتری داده می‌شود؛ گفتن شفاهی تنها کافی نیست.

- سلفون را حدود دو ساعت بعد بردار و دوش بگیر.
- سه روز اول، هر روز صبح و ظهر و شب دوش بگیر. در این سه روز چرب نکن.
- روز چهارم تاتو را باز بگذار.
- از روز پنجم تا یک ماه، روزی پنج بار با پماد دکسپانتونل، ملایم و لایهٔ نازک، چرب کن.

نکته‌های عمومی
- شستن ملایم با آب ولرم و شویندهٔ ملایم بدون عطر؛ خشک کردن با ضربهٔ آرام حولهٔ تمیز، نه کشیدن.
- پوسته را نکن و نخاران.
- تا بسته شدن کامل سطح: استخر، دریا، سونا، وان و خیس ماندن طولانی نه.
- آفتاب مستقیم و سولاریوم نه؛ پس از ترمیم کامل، ضدآفتاب با عامل محافظت ۳۰ یا بیشتر برای ماندگاری رنگ.
- لباس تنگ و زبر روی تاتو نمالد.

طبیعی یا هشدار
- طبیعی: قرمزی و تورم خفیف روزهای اول که کم می‌شود، خارش و پوسته، کدر شدن موقت.
- هشدار: قرمزی یا درد رو به افزایش، چرک، بوی بد، تب یا لرز، تاول یا جوش دردناک ⇐ مراجعه به پزشک (درس ۳۱).

نکته‌های کلیدی
- یک برگه، یک روش.
- سه روز دوش بدون چرب کردن، روز چهارم باز، از روز پنجم دکسپانتونل نازک.
- نشانهٔ هشدار = پزشک.

هشدار
- روش‌های اینترنتی یا روش استودیوهای دیگر (مثل پانسمان فیلمی) را با این روش قاطی نکن، مگر استاد روش استودیو را تغییر دهد.
- اگر مشتری به پماد حساسیت نشان داد، مصرف را قطع کند و با استودیو و در صورت نیاز پزشک تماس بگیرد.

تمرین
هدف: برگهٔ مراقبت را بدون خطا برای مشتری توضیح بدهی.
وسایل: برگهٔ مراقبت استودیو
1. برگه را در دو دقیقه توضیح بده.
2. به سه پرسش رایج مشتری (استخر، پوسته، باشگاه) جواب بده.
3. یک نشانهٔ هشدار را تشخیص و ارجاع بده.
قبول وقتی:
- هیچ دستوری خارج از برگهٔ استودیو گفته نشود.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- Caring for tattooed skin. American Academy of Dermatology
- Tattoos: 7 unexpected skin reactions and what to do about them. American Academy of Dermatology
- Tattoos: Understand risks and precautions. Mayo Clinic
$qzlrgskqn$, 1, true, 'cur-grp-c12', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-30-a', 'cur-30', '/api/tattoo/curriculum-image/cur-30-a', 'curriculum', $q4d54s800$برگهٔ مراقبت استودیو در یک نگاه.$q4d54s800$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-31', 'cur-mod-p4', $q7s6k47l7$عوارض پوستی و زمان ارجاع به پزشک$q7s6k47l7$, $qciejnmp4$سطح
متوسط

خلاصه
بیشتر تاتوها بدون مشکل خوب می‌شوند، ولی عفونت، حساسیت، واکنش به آفتاب، گرانولوم، کلوئید و شعله‌ور شدن بیماری پوستی ممکن است رخ دهد؛ گاهی سال‌ها بعد. کار تاتوکار شناختن نشانهٔ هشدار و ارجاع سریع است.

هدف‌ها
- عوارض اصلی تاتو و زمان احتمالی بروز آن‌ها را نام ببری.
- نشانه‌های فوری و غیرفوری ارجاع را جدا کنی.
- واکنش حرفه‌ای به پیام مشتری دربارهٔ مشکل را اجرا کنی.

عوارض اصلی
- عفونت: قرمزی و دردِ رو به افزایش، چرک، تب، لرز، زخم باز؛ ممکن است روزها و گاهی دیرتر رخ دهد.
- حساسیت به رنگ: بثورات خارش‌دار، برجستگی یا پوسته در بخشی از طرح (اغلب یک رنگ خاص)؛ ممکن است سال‌ها بعد ظاهر شود.
- واکنش به آفتاب: تورم، قرمزی یا جوش‌های خارش‌دار روی تاتو پس از آفتاب.
- گرانولوم و کلوئید: برآمدگی یا جوشگاه برجسته.
- پدیدهٔ کوبنر: ظاهر شدن بیماری پوستی موجود (مثل پسوریازیس) روی تاتو.
- سوزش یا تورم نادر هنگام MRI.

ارجاع فوری
- تنگی نفس، تپش قلب، تورم صورت یا گلو، کهیر گسترده، سرگیجه شدید ⇐ اورژانس.
- تب، لرز، قرمزی که سریع گسترش می‌یابد یا خط قرمز رو به بالا ⇐ پزشک همان روز.

ارجاع غیرفوری
- واکنش خفیف یا متوسط که بیش از یک تا دو هفته طول بکشد ⇐ متخصص پوست.
- هر تغییر ماندگار در پوست تاتو، از جمله برجستگی یا تغییر خال ⇐ متخصص پوست.

رفتار حرفه‌ای
- پیام مشتری را جدی بگیر؛ عکس روشن بخواه یا حضوری ببین.
- تشخیص نده و دارو یا پماد درمانی توصیه نکن؛ ارجاع بده.
- شمارهٔ ساخت رنگ‌ها را از پرونده به مشتری بده تا به پزشک نشان دهد.
- اتفاق را در پرونده ثبت کن.

نکته‌های کلیدی
- عارضه ممکن است دیر بیاید.
- نشانه‌های تنفسی و تورم صورت = اورژانس.
- ارجاع، نه تشخیص.

هشدار
- جملهٔ «طبیعی است، پماد بزن» برای نشانهٔ هشدار ممنوع است.

تمرین
هدف: ده پیام فرضی مشتری را دسته‌بندی و پاسخ بدهی.
وسایل: کارت‌های سناریو
1. هر پیام را در سه دسته بگذار: طبیعی، پزشک غیرفوری، فوری.
2. برای هر کدام پاسخ کوتاه و مؤدبانه بنویس.
3. با استاد بازبینی کن.
قبول وقتی:
- هیچ مورد فوری در دستهٔ طبیعی قرار نگیرد.

واژه‌ها
- گرانولوم (Granuloma): برآمدگی التهابی مزمن واکنش بدن به رنگدانه.
- کلوئید (Keloid): جوشگاه برجسته‌ای که از حد زخم بیرون می‌زند.
- پدیدهٔ کوبنر (Koebner phenomenon): ظاهر شدن بیماری پوستی (مثل پسوریازیس) روی جای آسیب یا تاتو.

منابع
- Tattoos: 7 unexpected skin reactions and what to do about them. American Academy of Dermatology
- Tattoos, Temporary Tattoos & Permanent Makeup. U.S. FDA
- Tattoos: Understand risks and precautions. Mayo Clinic
- Kluger N. Contraindications for tattooing. Karger — Curr Probl Dermatol 2015;48:76-87 (Tattooed Skin and Health)
$qciejnmp4$, 2, true, 'cur-grp-c12', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-31-a', 'cur-31', '/api/tattoo/curriculum-image/cur-31-a', 'curriculum', $qa46jd6e7$از نشانه تا اقدام: طبیعی، پزشک، اورژانس.$qa46jd6e7$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-32', 'cur-mod-p5', $quoi5u87e$ترمیم و خواندن کار خوب‌شده$quoi5u87e$, $q1rb494xs$سطح
پیشرفته

خلاصه
کیفیت واقعی تاتو پس از ترمیم کامل دیده می‌شود. خواندن کار خوب‌شده بهترین معلم تکنیک است و ترمیم (تاچ‌آپ) فقط روی پوست کاملاً آرام و برای جاهای مشخص انجام می‌شود.

هدف‌ها
- کار خوب‌شده را از نظر خط، اشباع و بلوآوت ارزیابی کنی.
- زمان و دامنهٔ ترمیم را تعیین کنی.
- تفاوت ترمیم، تقویت کار قدیمی و اصلاح خطای بزرگ را بدانی.

خواندن کار خوب‌شده
- عکس با نور یکسان از روز اول و پس از ترمیم کامل مقایسه شود.
- خط: پیوسته و تیز یا بریده و پخش؟
- اشباع: لکه‌های خالی، به‌ویژه روی مفصل و جاهای پرسایش.
- بلوآوت و هاله: در کدام جهت و چه ناحیه‌ای؟ معمولاً نشانهٔ زاویه یا کشش.
- نتیجه را در برگهٔ تمرین یا پرونده ثبت کن تا تکنیک اصلاح شود.

ترمیم (تاچ‌آپ)
- فقط پس از بسته شدن کامل سطح و آرام شدن پوست (درس ۴).
- فقط جاهای مشخص؛ کار دوباره روی کل طرح پوست را خسته می‌کند.
- علت کم‌رنگی را پیدا کن: مراقبت، جای بدن یا تکنیک؛ اگر تکنیک بوده، در ترمیم اصلاح کن.

تقویت کار قدیمی
- تاتوی سال‌ها مانده خط پهن‌تر و ارزش‌های نزدیک‌تر دارد؛ تقویت معمولاً با خط و سایهٔ تیره‌تر انجام می‌شود، نه با تکرار خط‌های ریز اولیه.
- کار هنرمند دیگر را فقط با رضایت مشتری و با احترام به اثر اصلی تقویت کن.

نکته‌های کلیدی
- کیفیت را پس از ترمیم بخوان.
- ترمیم فقط روی پوست آرام و جای مشخص.
- علت را پیدا کن، نه فقط رنگ اضافه.

هشدار
- وعدهٔ ترمیم در دورهٔ پوسته‌ریزی نده.

تمرین
هدف: یک کار خوب‌شده را ارزیابی کنی.
وسایل: عکس‌های قبل و بعد سه کار استودیو
1. برای هر کار جدول خط، اشباع، بلوآوت پر کن.
2. علت احتمالی هر مشکل را بنویس.
3. برنامهٔ ترمیم بنویس.
قبول وقتی:
- علت‌ها فنی و قابل‌اصلاح باشند.

واژه‌ها
- ترمیم (تاچ‌آپ) (Touch-up): تکمیل بخش‌های کم‌رنگ پس از خوب شدن کامل.
- بلوآوت (پخش‌شدگی رنگ) (Blowout): هالهٔ آبی‌خاکستری دور خط، معمولاً از ورود رنگ به عمق نادرست یا کشش و زاویهٔ غلط.
- اشباع (Saturation / packing): پر شدن یکدست رنگ در میان‌پوست بدون جای خالی.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- Physiology, Wound Healing. StatPearls / NCBI Bookshelf
$q1rb494xs$, 1, true, 'cur-grp-c13', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-32-a', 'cur-32', '/api/tattoo/curriculum-image/cur-32-a', 'curriculum', $qkamwg3ek$کار خوب‌شده را با این سه معیار بخوان.$qkamwg3ek$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-32-b', 'cur-32', '/api/tattoo/curriculum-image/cur-32-b', 'curriculum', $qd8ovy1g2$کیفیت واقعی پس از ترمیم دیده می‌شود.$qd8ovy1g2$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-33', 'cur-mod-p5', $qe7zdwwet$کاور، بلست‌اور، ادامهٔ کار قبلی، جای زخم و لیزر$qe7zdwwet$, $qnyrq1ror$سطح
پیشرفته

خلاصه
کار روی پوستی که قبلاً تاتو، زخم یا لیزر دیده، طراحی و قضاوت بیشتری می‌خواهد. کاور یعنی پنهان کردن کامل با طرح تیره‌تر و بزرگ‌تر؛ بلست‌اور یعنی کار تازه روی کار قدیمی بدون پنهان کردن کامل.

هدف‌ها
- امکان‌پذیری کاور را بسنجی و انتظار مشتری را واقع‌بینانه کنی.
- تفاوت کاور و بلست‌اور را توضیح بدهی.
- احتیاط‌های کار روی جای زخم، ترک پوست و پوست لیزرشده را بدانی.

کاور
- طرح تازه معمولاً بزرگ‌تر و تیره‌تر از کار قدیمی است؛ رنگ روشن روی رنگ تیره را نمی‌پوشاند.
- طرح را روی عکس کار قدیمی (با کاغذ پوستی یا نرم‌افزار) بکش تا محل خط‌های قدیمی در بخش‌های تیره یا بافت‌دار طرح تازه بیفتد.
- گاهی چند جلسه لیزر کم‌رنگ‌کننده پیش از کاور نتیجه را خیلی بهتر می‌کند؛ لیزر کار پزشک یا متخصص دارای صلاحیت است.

بلست‌اور و ادامهٔ کار قبلی
- بلست‌اور: کار قدیمی دیده می‌ماند و طرح تازه روی آن جلوه می‌کند؛ انتخاب سبکی است، نه کاور ناموفق.
- ادامهٔ کار هنرمند دیگر: سبک، ارزش‌ها و جهت جریان کار قبلی را بخوان و با رضایت مشتری هماهنگ کن.

جای زخم و ترک پوست
- زخم باید کاملاً بالغ شده باشد (اغلب ماه‌ها پس از ایجاد)؛ زمان دقیق را پزشک تعیین می‌کند.
- پوست جوشگاه رنگ را نامنظم می‌گیرد و ممکن است بیشتر خونریزی کند یا پخش شود؛ ضربه سبک و انتظار واقع‌بینانه.
- کلوئید و جوشگاه برجستهٔ فعال کار نمی‌شوند؛ ارجاع به متخصص پوست.
- زخم ناشی از آسیب به خود یا جراحی اخیر: با حساسیت و احترام، و در صورت نیاز با نظر پزشک.

پوست لیزرشده
- پس از لیزر، پوست باید کاملاً خوب شده باشد؛ تاول، قرمزی یا لک فعال یعنی صبر.
- طبق انجمن پوست آمریکا، نتیجه و عارضهٔ لیزر به رنگ، عمق، رنگ پوست، سلامت و داروهای فرد بستگی دارد و مشاوره با متخصص پوست توصیه می‌شود.

نکته‌های کلیدی
- کاور = بزرگ‌تر و تیره‌تر.
- بلست‌اور انتخاب سبکی است.
- زخم و پوست لیزرشده پس از ترمیم کامل و با نظر پزشک.

هشدار
- وعدهٔ پوشاندن کامل هر تاتو را نده.
- تاتوکار لیزر پزشکی انجام نمی‌دهد مگر صلاحیت و مجوز قانونی داشته باشد.

تمرین
هدف: طرح کاور برای یک تاتوی قدیمی فرضی.
وسایل: عکس چاپی تاتوی قدیمی، کاغذ پوستی
1. کار قدیمی را با رنگ روشن روی کاغذ پوستی ردیابی کن.
2. دو طرح کاور بکش که خط‌های قدیمی در بخش تیره بیفتند.
3. امکان‌پذیری و تعداد جلسه را بنویس.
قبول وقتی:
- هیچ خط قدیمی زیر بخش روشن طرح نیفتد.

واژه‌ها
- کاور (Cover-up): پوشاندن تاتوی قبلی با طرح تازه.
- بلست‌اور (Blast-over): اجرای طرح تازه روی تاتوی قدیمی بی‌آنکه آن را کاملاً پنهان کند.
- کلوئید (Keloid): جوشگاه برجسته‌ای که از حد زخم بیرون می‌زند.

منابع
- Tattoo removal: Lasers outshine other methods. American Academy of Dermatology
- Tattoos: 7 unexpected skin reactions and what to do about them. American Academy of Dermatology
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qnyrq1ror$, 2, true, 'cur-grp-c13', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-33-a', 'cur-33', '/api/tattoo/curriculum-image/cur-33-a', 'curriculum', $q6h5fz9qg$خط‌های قدیمی باید در بخش‌های تیرهٔ طرح تازه بیفتند.$q6h5fz9qg$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-33-b', 'cur-33', '/api/tattoo/curriculum-image/cur-33-b', 'curriculum', $quu7sb4hy$نمونهٔ کاور استودیو.$quu7sb4hy$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-34', 'cur-mod-p5', $qj9w96n7b$پروژهٔ بزرگ، آستین، بک‌پیس و جلسهٔ طولانی$qj9w96n7b$, $qt4ug910z$سطح
پیشرفته

خلاصه
کار بزرگ با نقشهٔ کلی، تقسیم به جلسه‌های منطقی و احترام به ظرفیت پوست و مشتری انجام می‌شود. جریان بدن، پس‌زمینه و جای کارهای قدیمی از ابتدا در طرح دیده می‌شوند.

هدف‌ها
- نقشهٔ آستین یا بک‌پیس را با جریان بدن طراحی کنی.
- پروژه را به جلسه‌های ایمن تقسیم کنی.
- مرز توقف در جلسهٔ طولانی را تشخیص بدهی.

طراحی کلی
- عنصر اصلی در بزرگ‌ترین و صاف‌ترین بخش (بیرون بازو، وسط پشت).
- پس‌زمینه (ابر، موج، باد، بافت هندسی) کارها را به هم وصل و فاصله‌ها را پر می‌کند.
- جای کارهای قدیمی، خال‌ها و جوشگاه‌ها در نقشه علامت بخورد.
- طرح را با ماژیک پوستی روی بدن ایستاده بکش یا روی عکس بدن طراحی کن.

تقسیم جلسه
- اول خط کل یا خط بخش اصلی؛ سایه و رنگ در جلسه‌های بعد.
- بین جلسه‌های یک ناحیه، ترمیم کامل لازم است؛ روی پوست ترمیم‌نشده کار نکن.
- طول جلسه با تحمل مشتری و وضعیت پوست تعیین می‌شود، نه با برنامهٔ پرداخت.

جلسهٔ طولانی
- استراحت کوتاه منظم، آب و خوراکی؛ پایش رنگ‌پریدگی و تعریق (درس ۲۲).
- پوست خسته رنگ نمی‌گیرد؛ توقف بهتر از اصرار است (درس ۲۴).
- تحمل درد مشتری معیار ادامه نیست؛ وضعیت پوست معیار است.

نکته‌های کلیدی
- نقشهٔ کلی پیش از اولین خط.
- ترمیم کامل بین جلسه‌های یک ناحیه.
- پوست معیار توقف است.

هشدار
- طول جلسه را برای «زود تمام شدن» از ظرفیت پوست بیشتر نکن.

تمرین
هدف: نقشهٔ یک آستین را با برنامهٔ جلسه بنویسی.
وسایل: قالب طرح دست، کاغذ پوستی
1. سه عنصر اصلی و پس‌زمینه را جانمایی کن.
2. جهت جریان را با فلش مشخص کن.
3. برنامهٔ ۵ تا ۸ جلسه با فاصلهٔ ترمیم بنویس.
قبول وقتی:
- هیچ دو جلسهٔ پشت‌سرهم روی یک ناحیهٔ ترمیم‌نشده نباشد.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qt4ug910z$, 3, true, 'cur-grp-c13', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-34-a', 'cur-34', '/api/tattoo/curriculum-image/cur-34-a', 'curriculum', $qkpjf55as$نقشهٔ کلی آستین پیش از اولین خط.$qkpjf55as$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-35', 'cur-mod-p5', $qd70axncg$پرتره، حیوان، یادبود و فری‌هند$qd70axncg$, $qeo1xsuzi$سطح
پیشرفته

خلاصه
پرتره و تاتوی یادبود بار عاطفی دارند و خطای کوچک در آن‌ها بزرگ دیده می‌شود. عکس مرجع خوب، اندازهٔ کافی و صداقت دربارهٔ محدودیت پوست شرط کارند. فری‌هند طراحی مستقیم روی پوست با ماژیک است و تسلط طراحی می‌خواهد.

هدف‌ها
- عکس مرجع مناسب پرتره را انتخاب کنی.
- حداقل اندازهٔ منطقی پرتره را توضیح بدهی.
- گفت‌وگوی حساس دربارهٔ تاتوی یادبود را حرفه‌ای انجام بدهی.

پرتره انسان و حیوان
- عکس واضح، با نور جهت‌دار و وضوح کافی از چشم‌ها؛ عکس تار یعنی حدس زدن جزئیات.
- صورت باید آن‌قدر بزرگ باشد که چشم و لب جزئیات خوانا داشته باشند؛ پرترهٔ خیلی کوچک با گذر زمان در هم می‌رود.
- نسبت‌ها را با شبکه یا نقطه‌های راهنما در استنسیل دقیق منتقل کن.
- در حیوان، جهت مو و درخشش چشم بیشترین شباهت را می‌سازد.

تاتوی یادبود
- گفت‌وگو با آرامش و بدون عجله؛ نام‌ها، تاریخ‌ها و دست‌خط را کتبی تأیید کن.
- دست‌خط عزیز ازدست‌رفته را با کیفیت بالا اسکن کن و در اندازهٔ خوانا اجرا کن.
- اگر عکس مرجع کیفیت ندارد، صادقانه بگو و گزینهٔ نمادین پیشنهاد کن.

فری‌هند
- طرح مستقیماً با ماژیک پوستی روی بدن کشیده می‌شود تا با جریان عضله هماهنگ باشد.
- ماژیک یک‌بارمصرف یا مخصوص همان مشتری؛ پیش از سوزن، مشتری طرح را تأیید کند.
- برای کارآموز پس از تسلط کامل بر طراحی و استنسیل.

نکته‌های کلیدی
- عکس مرجع واضح، اندازهٔ کافی.
- تأیید کتبی نام و تاریخ.
- فری‌هند پس از تسلط طراحی.

هشدار
- قول شباهت صددرصد نده؛ پوست کاغذ نیست.

تمرین
هدف: پرترهٔ طراحی‌شده از یک عکس با کیفیت روی کاغذ.
وسایل: عکس مرجع، کاغذ، شبکهٔ راهنما
1. عکس را با شبکهٔ ۴×۴ تقسیم و روی کاغذ منتقل کن.
2. سه ارزش اصلی را مشخص کن.
3. استنسیل نهایی را بساز.
قبول وقتی:
- نسبت چشم‌ها و بینی با مرجع هماهنگ باشد.

واژه‌ها
- ارزش رنگی (روشنی و تیرگی) (Value): میزان روشنی یا تیرگی یک رنگ، مستقل از فام.
- استنسیل (Stencil): کپی طرح روی پوست برای راهنمای خط.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
- Jack Rudy — از پایه‌گذاران سیاه و خاکستری و خط تک‌سوزن. Wikipedia
$qeo1xsuzi$, 4, true, 'cur-grp-c13', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-35-a', 'cur-35', '/api/tattoo/curriculum-image/cur-35-a', 'curriculum', $qdowdy9c7$نسبت‌های چهره با شبکهٔ راهنما منتقل می‌شوند.$qdowdy9c7$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-35-b', 'cur-35', '/api/tattoo/curriculum-image/cur-35-b', 'curriculum', $q7rsufx1c$نمونهٔ پرترهٔ استودیو.$q7rsufx1c$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-36', 'cur-mod-p5', $qcsg39b02$نقشهٔ سبک‌ها و نیاز فنی هر سبک$qcsg39b02$, $q7a46teh7$سطح
پیشرفته

خلاصه
سبک یعنی زبان تصویری و روش ساخت طرح، نه نوع سوزن. هر سبک خانوادهٔ مهارت‌های خودش را دارد و ماندگاری‌اش به خط، کنتراست و اندازه بستگی دارد. نام هنرمندان شاخص فقط برای مطالعه است؛ آثارشان کپی نمی‌شود.

هدف‌ها
- سبک‌های اصلی را در شش خانواده دسته‌بندی کنی.
- نیاز فنی و ماندگاری هر خانواده را توضیح بدهی.
- برای هر خانواده منابع مطالعه و هنرمندان شاخص را بشناسی.

۱. سنتی و خط قوی
خط مشکی ضخیم، رنگ محدود و اشباع، سیلوئت خوانا؛ از ماندگارترین سبک‌ها.

- سنتی آمریکایی: نقش‌مایه‌های کلاسیک (عقاب، گل رز، لنگر)، خط ضخیم و رنگ اصلی. هنرمند شاخص: «سیلور جری» (نورمن کالینز) و «دان اد هاردی».
- نئوسنتی: ساختار سنتی با جزئیات، گرادیان و پالت گسترده‌تر.
- سنتی ژاپنی (ایرزومی): کار بزرگ با پس‌زمینهٔ باد، موج و ابر و قواعد نمادین؛ معمولاً تمام‌بدن یا آستین. هنرمند شاخص: «هوریوشی سوم».
- نیواسکول: اغراق کارتونی، رنگ تند و خط ضخیم.
- نیاز فنی: لاینر بزرگ، اشباع کامل، سیلوئت.

۲. سیاه، نقش و هندسه
- تریبال: سطح‌های مشکی کامل و فرم‌های جاری با بدن. هنرمند شاخص: «لئو زولوئتا» (پدر تریبال مدرن).
- پلی‌نزی و سنت‌های بومی: نقش‌ها معنای فرهنگی و خانوادگی دارند؛ پیش از اجرا مطالعه و احترام فرهنگی لازم است.
- بلک‌ورک، اورنامنتال، هندسی، دات‌ورک، سلتیک: تقارن، تکرار دقیق، سطح مشکی یکدست یا نقطه‌ای.
- نیاز فنی: اشباع مشکی یکدست، تقارن روی بدن نامتقارن، نقطه‌گذاری کنترل‌شده.

۳. خط ظریف و نوشته
- فاین‌لاین و میکرورئالیسم: خط تک‌سوزن یا بسیار نازک و جزئیات ریز. هنرمند شاخص: «دکتر وو» (برایان وو).
- مینیمال، ایگنورنت (طراحی عمداً ساده و خام) و دست‌سوزن (استیک‌اندپوک).
- لترینگ و خوشنویسی (درس ۱۷).
- نیاز فنی: دست بسیار سبک و ثابت؛ ماندگاری کمتر روی جاهای پرحرکت و پوست تیره؛ ارزش‌ها با گذر زمان به هم نزدیک می‌شوند.

۴. رئال
- سیاه و خاکستری و پرتره: کاپ‌های رقیق و گرادیان نرم (درس ۲۸). هنرمند شاخص در شکل‌گیری این سبک: «جک رودی».
- چیکانو: سیاه و خاکستری با ریشه در فرهنگ مکزیکی‌تبار لس‌آنجلس، خط ظریف و لترینگ. چهرهٔ شناخته‌شدهٔ تاتو و گرافیتی لس‌آنجلس: «میستر کارتون».
- رئالیسم رنگی و بایومکانیکال (الهام‌گرفته از زیبایی‌شناسی آثار نقاش «اچ. آر. گیگر»).
- نیاز فنی: ارزش رنگی دقیق، عکس مرجع باکیفیت، اندازهٔ کافی.

۵. تصویری و آزاد
- واترکالر، ایلوستریتیو، اسکچ، ترش‌پولکا، سوررئال، انیمه و مانگا، انتزاعی.
- هنر تاریک: سیاه و خاکستری با فضای سوررئال تاریک؛ هنرمند شاخص: «پل بوث».
- نیاز فنی: برای ماندگاری، حتی در سبک‌های بی‌خط، ساختار ارزشی یا خط پنهان لازم است؛ لبه‌های نرم بدون ساختار با گذر زمان محو می‌شوند.

۶. سنت‌های آیینی
- ساک یانت (یانترا): تاتوی آیینی جنوب‌شرق آسیا با معنای مذهبی و قواعد سنتی؛ اجرای آن بدون شناخت و احترام به این سنت توصیه نمی‌شود.

هنرمندان مرجع برای مطالعه (با منبع)
این فهرست فقط نام‌هایی را می‌آورد که برایشان منبع معتبر و قابل‌بررسی پیدا شد. جمله‌هایی که با «به گفتهٔ خودش» آمده‌اند دیدگاه خود هنرمندند، نه واقعیت تأییدشده. هیچ اثری از این هنرمندان در درس‌نامه آورده نشده است؛ برای دیدن کارها به صفحهٔ رسمی و منبع هر نام رجوع کن.

- سنتی آمریکایی — «سیلور جری» (نورمن کالینز): به نوشتهٔ رادیو و تلویزیون عمومی کالیفرنیای شمالی (KQED)، بسیاری او را پدر تاتوی مدرن آمریکایی می‌دانند؛ از نخستین کسانی بود که سبک آسیایی و غربی را تلفیق کرد و تا ۱۹۷۳ در هاوایی کار می‌کرد.
- سنتی ژاپنی — هوریوشی سوم: استاد معاصر ایرزومی و شاگرد هوریوشی اول. به گفتهٔ خودش، تاتوی دستی ژاپنی (تبوری) را فقط زیر نظر استاد می‌توان آموخت.
- سیاه و خاکستری و چیکانو — به گزارش رادیو ملی آمریکا (NPR)، این سبک در شرق لس‌آنجلس از تاتوی زندان با تک‌سوزن و مشکیِ رقیق‌شده شکل گرفت و فردی نگرته از کسانی بود که آن را به جریان اصلی آورد. به نوشتهٔ سایت رسمی کارگاه «گود تایم چارلی» (محل کار جک رودی)، آن‌جا این سبک حرفه‌ای شد و سیاه پایهٔ اثر قرار گرفت. مجلهٔ تاتو لایف مارک ماهونی را از پیشگامان سیاه و خاکستری تک‌سوزن می‌داند.
- چیکانو و لترینگ — میستر کارتون: به نوشتهٔ لس‌آنجلس تایمز، فقط با مشکی و خاکستری و خط ظریف کار می‌کند و از پرسپکتیو و لایه‌های عمق بهره می‌برد.
- خط ظریف و تک‌سوزن — دکتر وو: طبق سایت رسمی‌اش، کار را زیر نظر مارک ماهونی آغاز کرد و ظرافت سبک تک‌سوزن را از او آموخت.
- رئالیسم رنگی — نیکو هورتادو: به نوشتهٔ ال‌اِی ویکلی، از شناخته‌شده‌ترین رئالیست‌های رنگی است؛ به گفتهٔ خودش اصل کارش این است: «آنچه را می‌بینی بکش و زیاد تغییرش نده».
- تریبال — لئو زولوئتا: نشریهٔ آن‌آربر آبزرور او را «پدر تاتوی تریبال مدرن» می‌نامد؛ سبکی الهام‌گرفته از سنت‌های اقیانوس آرام با الگوهای درهم‌تنیده و کنتراست شدید.
- بلک‌ورک و الگو — توماس هوپر: به گفتهٔ خودش، از تاتو و چاپ چوبی ژاپنی آموخته که زیبایی در تکرار است و بخش بزرگ کارش را خط تمیز با کشش درست پوست می‌داند.
- هندسی و ماندالا با دست‌سوزن — گریس نوترال: به گفتهٔ خودش در گاردین، بیشتر با روش دستی کار می‌کند و به تقارن و الگوهای سایه‌دار شناخته می‌شود.
- آبرنگی — آماندا واچوب: به نوشتهٔ موزهٔ هنر معاصر دنور، سبکی الهام‌گرفته از نقاشی مدرن با ضربه‌قلم، واش و پاشیدگی رنگ را پایه گذاشت.
- ترش‌پولکا — سیمونه پفاف و فولکر مرشکی: به نوشتهٔ مجلهٔ آرت آن اسکین، این سبک به آن دو نسبت داده می‌شود؛ معمولاً مشکی و قرمز، کلاژی از تصویر واقعی، لکه، شکل هندسی و حروف، روی سطح بزرگ بدن.
- لترینگ — بی‌جی بتز: نویسندهٔ راهنماهای حروف‌نگاری تاتو. به گفتهٔ خودش: خوانایی بر تزئین مقدم است، املا باید بررسی شود و متن ریز در اندازهٔ کوچک جواب نمی‌دهد.

اصل حرفه‌ای
از آثار هنرمندان شاخص برای فهم ترکیب، خط و ارزش رنگی بیاموز؛ تصویر کار آن‌ها را برای مشتری کپی نکن (درس ۱۸). برای دیدن آثار، به صفحهٔ رسمی، کتاب‌ها و نمایشگاه‌های خود هنرمند رجوع کن.

نکته‌های کلیدی
- سبک = زبان تصویری، نه سوزن.
- ماندگاری = خط + کنتراست + اندازه.
- یادگیری از هنرمندان شاخص، بدون کپی.

هشدار
- نقش‌های فرهنگی و آیینی (پلی‌نزی، ساک یانت) را بدون شناخت و احترام اجرا نکن.

تمرین
هدف: یک موضوع را در سه سبک طراحی کنی.
وسایل: کاغذ، ماژیک
1. یک گل رز را در سبک سنتی، فاین‌لاین و سیاه و خاکستری بکش.
2. برای هر نسخه سوزن و ماندگاری را بنویس.
3. یک هنرمند شاخص هر سبک را از منابع درس مطالعه و یک نکتهٔ فنی از او یادداشت کن.
قبول وقتی:
- تفاوت فنی سه نسخه روشن و درست توضیح داده شود.

واژه‌ها
- لاینر گرد (Round Liner, RL): سوزن‌هایی که در دایره‌ای فشرده لحیم شده‌اند؛ برای خط.
- مگنوم بافته (Weaved Magnum, M1): دو ردیف سوزن درهم؛ برای پرکردن و سایهٔ سطح بزرگ. با فلت (یک ردیف صاف) فرق دارد.
- کاپ‌های رقیق خاکستری (Grey wash): رقیق کردن مشکی برای ساختن چند ارزش خاکستری.
- نقطه‌گذاری (Stippling / dotwork): ساختن سایه با تراکم نقطه.

منابع
- Hori Smoku Sailor Jerry. KQED
- Sailor Jerry (Norman Collins) — از پایه‌گذاران سبک سنتی آمریکایی. Wikipedia
- Don Ed Hardy — اثرگذار بر شکل‌گیری سبک‌های مدرن و پیوند سنت ژاپنی و آمریکایی. Wikipedia
- Horiyoshi III. Tattoo Society Magazine
- Horiyoshi III — استاد تاتوی سنتی ژاپنی تمام‌بدن (هوریمونو). Wikipedia
- Irezumi — تاتوی سنتی ژاپنی. Wikipedia
- Black And Gray … And Brown: A Tattoo Style's Chicano Roots. NPR Code Switch (2018)
- About. Good Time Charlie (official site)
- Mark Mahoney: from the Pike to Beverly Hills. Tattoo Life (2018)
- Jack Rudy — از پایه‌گذاران سیاه و خاکستری و خط تک‌سوزن. Wikipedia
- More than skin deep (Mister Cartoon). Los Angeles Times (2002)
- Mister Cartoon (Mark Machado) — تاتو و گرافیتی لس‌آنجلس. Wikipedia
- Bio. Dr. Woo (official site)
- Dr. Woo (Brian Woo) — فاین‌لاین تک‌سوزن و میکرورئالیسم. Wikipedia
- Meet the local tattoo artist making headlines (Nikko Hurtado). LA Weekly (2017)
- Leo Zulueta and Jared Leathers. Ann Arbor Observer (2009)
- Leo Zulueta — شناخته‌شده به «پدر تریبال مدرن». Wikipedia
- Artist Thomas Hooper on juggling creative outlets. The Creative Independent (2019)
- Meet the world's best tattoo artists. The Guardian / Observer (2022)
- Amanda Wachob: Tattoo This. MCA Denver
- Style Feature: Trash Polka. Art on Skin Magazine
- The Complex Guide To Tattoo Lettering. Complex (2011)
- H. R. Giger — نقاش؛ الهام‌بخش زیبایی‌شناسی بایومکانیکال. Wikipedia
- Paul Booth — سیاه و خاکستری با فضای سوررئال تاریک. Wikipedia
- Yantra tattooing (ساک یانت). Wikipedia
- Understanding Copyright and Related Rights. WIPO
$q7a46teh7$, 1, true, 'cur-grp-c14', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-36-a', 'cur-36', '/api/tattoo/curriculum-image/cur-36-a', 'curriculum', $q8ejxiktb$شش خانوادهٔ سبک و نیاز فنی هر کدام. (بخش ۱ از ۲)$q8ejxiktb$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-36-a2', 'cur-36', '/api/tattoo/curriculum-image/cur-36-a2', 'curriculum', $qw60k37ge$ادامه: رئال، تصویری و آزاد، سنت‌های آیینی. (بخش ۲ از ۲)$qw60k37ge$, 2)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-37', 'cur-mod-p5', $qzkbyxcce$عکاسی و نمونه‌کار$qzkbyxcce$, $qfsony031$سطح
پیشرفته

خلاصه
نمونه‌کار ویترین استودیوست. عکس درست، کار را همان‌طور که هست نشان می‌دهد: نور یکنواخت، بدون فیلتر، با رضایت مشتری و ترجیحاً با یک عکس از کار خوب‌شده.

هدف‌ها
- عکس تمیز و واقعی از تاتو بگیری.
- رضایت و حریم خصوصی مشتری را رعایت کنی.
- نمونه‌کار منظم و صادقانه بسازی.

عکاسی
- نور یکنواخت و غیرمستقیم (نور روز یا دو منبع نرم)؛ بدون فلاش مستقیم که براقی می‌سازد.
- پوست تمیز و بدون لایهٔ براق ضخیم.
- دوربین عمود بر مرکز تاتو؛ روی بدن منحنی چند زاویه یا عکس پیوسته.
- بدون فیلتر و تغییر رنگ؛ برش و صاف کردن نور مجاز، تغییر خود کار نه.
- زمینهٔ ساده و بدون شلوغی.

رضایت و حریم خصوصی
- رضایت کتبی جداگانه برای عکس و انتشار.
- چهره، خال‌کوبی‌های شناسایی‌کننده و نام مشتری بدون اجازه منتشر نشود.
- عکس کار پیش از رضایت در شبکه‌های اجتماعی گذاشته نشود.

نمونه‌کار
- کار تازه و، هرجا ممکن است، همان کار پس از ترمیم.
- فقط کار خودت؛ کار دیگران یا تصویر تولیدی نرم‌افزار به‌جای کار واقعی ممنوع.
- دسته‌بندی بر اساس سبک.

نکته‌های کلیدی
- نور یکنواخت، بدون فیلتر.
- رضایت کتبی برای انتشار.
- نمونه‌کار فقط از کار واقعی خودت.

هشدار
- ویرایش عکس برای پنهان کردن خطا فریب مشتری است.

تمرین
هدف: عکس استاندارد از یک کار تمرینی بگیری.
وسایل: پوست مصنوعی تمرین‌شده، تلفن، دو منبع نور
1. با نور یکنواخت و عمود عکس بگیر.
2. یک عکس بد (فلاش مستقیم، زاویه) هم بگیر.
3. تفاوت را توضیح بده.
قبول وقتی:
- عکس نهایی بدون بازتاب و اعوجاج باشد.

منابع
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qfsony031$, 1, true, 'cur-grp-c15', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-37-a', 'cur-37', '/api/tattoo/curriculum-image/cur-37-a', 'curriculum', $q7a7b0oqc$نور یکنواخت از دو طرف و دوربین عمود.$q7a7b0oqc$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-38', 'cur-mod-p5', $qgzwz3n7r$قیمت، بیعانه، پروندهٔ مشتری و نگهداری تجهیزات$qgzwz3n7r$, $qpsloyms7$سطح
پیشرفته

خلاصه
حرفه‌ای بودن یعنی قیمت شفاف، قاعدهٔ روشن بیعانه، پروندهٔ کامل و محرمانه، و تجهیزات نگهداری‌شده با دفتر ثبت. این درس برای آشنایی کارآموز است؛ قیمت و بیعانهٔ این استودیو را فقط استاد تعیین می‌کند.

هدف‌ها
- اجزای منطقی قیمت‌گذاری را بشناسی.
- اجزای پروندهٔ مشتری را تکمیل کنی.
- برنامهٔ نگهداری دستگاه، اتوکلاو و فضای کار را اجرا کنی.

قیمت و بیعانه (آشنایی)
- قیمت معمولاً بر پایهٔ زمان، اندازه، پیچیدگی، جای بدن و هزینهٔ مواد تعیین می‌شود.
- بیعانه وقت طراحی و نوبت را تضمین می‌کند؛ شرایط بازگشت یا انتقال آن پیش از پرداخت کتبی گفته شود.
- کارآموز قیمت یا بیعانه وعده نمی‌دهد.

پروندهٔ مشتری
- مشخصات تماس، فرم سلامت، رضایت‌نامه، رضایت عکاسی.
- طرح نهایی، جای بدن، سوزن‌ها، رنگ‌ها با شمارهٔ ساخت، تاریخ و طول جلسه.
- هر عارضه یا تماس پس از کار.
- نگهداری محرمانه و طبق قانون حفاظت داده و مدت نگهداری محل.

نگهداری تجهیزات
- دستگاه و منبع تغذیه: تمیز کردن بیرونی پس از هر کار طبق دستور سازنده؛ بازرسی کابل و اتصال‌ها.
- اتوکلاو: پایش هر چرخه و آزمون اسپور دوره‌ای (دست‌کم هفتگی طبق توصیهٔ مرکز کنترل بیماری آمریکا) با ثبت در دفتر.
- انبار: کارتریج و رنگ با تاریخ انقضا؛ اول‌وارد-اول‌مصرف؛ بستهٔ آسیب‌دیده دور ریخته شود.
- فضای کار: برنامهٔ تمیز کردن روزانه و هفتگی؛ ظرف تیز طبق قاعدهٔ پسماند محل تحویل شود.

نکته‌های کلیدی
- قیمت و بیعانه شفاف و کتبی.
- پرونده کامل با شمارهٔ ساخت رنگ.
- دفتر نگهداری اتوکلاو و تجهیزات.

هشدار
- اطلاعات سلامت مشتری را در گروه‌های پیام‌رسان یا جای عمومی نگذار.

تمرین
هدف: یک پروندهٔ کامل و یک دفتر نگهداری هفتگی پر کنی.
وسایل: فرم پرونده، دفتر نگهداری
1. پروندهٔ یک مشتری فرضی را کامل کن.
2. برنامهٔ نگهداری یک هفته را بنویس.
3. سه مورد انقضای انبار را بررسی کن.
قبول وقتی:
- هیچ بخش پرونده خالی نماند.

واژه‌ها
- اتوکلاو (Autoclave): دستگاه استریل با بخار تحت فشار.
- آزمون اسپور (Biological indicator / spore test): آزمون زیستی که کشته‌شدن هاگ مقاوم را در چرخهٔ اتوکلاو ثابت می‌کند.
- رضایت‌نامهٔ آگاهانه (Informed consent): تأیید کتبی مشتری پس از دانستن طرح، خطر، مراقبت و هزینه.

منابع
- Sterilizing Practices — monitoring with mechanical, chemical and biological indicators. CDC
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
- روش و قانون کارگاهی همین استودیو (تجربهٔ استاد؛ منبع بیرونی ندارد). استودیو پیمان زیبائی‌فر
$qpsloyms7$, 2, true, 'cur-grp-c15', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-38-a', 'cur-38', '/api/tattoo/curriculum-image/cur-38-a', 'curriculum', $qmvhtm0bi$پروندهٔ کامل، پیگیری عارضه را ممکن می‌کند.$qmvhtm0bi$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
insert into tattoo_lessons (id, module_id, title, content, "order", is_published, group_id, updated_at)
values ('cur-39', 'cur-mod-p5', $qkjxcvlsi$مقررات، مسئولیت حرفه‌ای و تاتو در گذر سال‌ها$qkjxcvlsi$, $qce6v3aba$سطح
پیشرفته

خلاصه
تاتوکار مسئول ایمنی مشتری، رعایت مقررات محل کار و صداقت دربارهٔ آیندهٔ تاتوست. قوانین در هر کشور و شهر متفاوت‌اند؛ این درس اصول عمومی را می‌گوید و جای مشاورهٔ حقوقی را نمی‌گیرد.

هدف‌ها
- حوزه‌های اصلی مقررات کار تاتو را نام ببری.
- مسئولیت حرفه‌ای در برابر مشتری را توضیح بدهی.
- تغییرات تاتو در گذر سال‌ها را برای مشتری توضیح بدهی.

حوزه‌های مقررات (کلی)
- مجوز کسب و بهداشت محل کار طبق مرجع محلی.
- حداقل سن و رضایت ولی یا قیم طبق قانون محل.
- کنترل عفونت، پسماند تیز و پسماند آلوده طبق مقررات بهداشت محیط.
- ایمنی و برچسب رنگ (نمونهٔ مرجع بین‌المللی: مقررات ریچ اتحادیهٔ اروپا).
- حفاظت از داده‌های شخصی و سلامت مشتری.
- در ایران و هر کشور دیگر، مقررات و رویهٔ مراجع را از مرجع بهداشت و صنف محل بپرس؛ این درس قانون مشخصی را ادعا نمی‌کند.

مسئولیت حرفه‌ای
- اطلاع‌رسانی صادقانه دربارهٔ خطرها، محدودیت‌ها و مراقبت.
- ارجاع به پزشک در هر نشانهٔ هشدار؛ نه تشخیص و نه درمان.
- آموزش مداوم: کنترل عفونت و کمک‌های اولیه را به‌روز نگه دار.
- نپذیرفتن کاری که با مهارت، اخلاق یا ایمنی تو هم‌خوان نیست.

تاتو در گذر سال‌ها
- خط‌ها کمی پهن و ارزش‌ها به هم نزدیک می‌شوند؛ جزئیات خیلی ریز زودتر در هم می‌روند.
- آفتاب بیشترین عامل محو شدن است؛ ضدآفتاب پس از ترمیم کامل.
- تغییر وزن، بارداری و پیری شکل پوست را تغییر می‌دهند.
- واکنش پوستی ممکن است سال‌ها بعد رخ دهد (درس ۳۱).
- تاتو بررسی خال‌ها را سخت‌تر می‌کند؛ معاینهٔ دوره‌ای پوست با پزشک ارزشمند است.

نکته‌های کلیدی
- قانون محل مقدم است؛ از مرجع محلی بپرس.
- صداقت دربارهٔ آیندهٔ تاتو.
- آموزش مداوم.

هشدار
- این درس مشاورهٔ حقوقی یا پزشکی نیست.

تمرین
هدف: فهرست مقررات محل کار خودت را تهیه کنی.
وسایل: کاغذ، پرسش از استاد و مرجع محلی
1. پنج حوزهٔ مقررات را بنویس.
2. برای هر حوزه مرجع پاسخ‌گو در شهر خودت را پیدا کن (با کمک استاد).
3. یک متن دودقیقه‌ای دربارهٔ تاتو در گذر سال‌ها برای مشتری آماده کن.
قبول وقتی:
- هیچ قانونی بدون منبع ادعا نشود.

واژه‌ها
- رضایت‌نامهٔ آگاهانه (Informed consent): تأیید کتبی مشتری پس از دانستن طرح، خطر، مراقبت و هزینه.

منابع
- EN 17169:2020 Tattooing — Safe and hygienic practice. CEN / BSI
- Tattoo inks and permanent make-up. European Chemicals Agency (ECHA)
- Tattoos, Temporary Tattoos & Permanent Makeup. U.S. FDA
- Caring for tattooed skin. American Academy of Dermatology
- Do tattoos cause skin cancer?. American Academy of Dermatology
- Bloodborne Pathogens and Needlestick Prevention. OSHA (U.S. Department of Labor)
$qce6v3aba$, 3, true, 'cur-grp-c15', now())
on conflict (id) do update set
  module_id = excluded.module_id, title = excluded.title, content = excluded.content,
  "order" = excluded."order", is_published = true, group_id = excluded.group_id, updated_at = now();
insert into tattoo_lesson_images (id, lesson_id, image_path, image_data, caption, "order")
values ('cur-39-a', 'cur-39', '/api/tattoo/curriculum-image/cur-39-a', 'curriculum', $q2c4s5ejr$نمایش نمادین: خط‌ها پهن‌تر و ارزش‌ها نزدیک‌تر می‌شوند.$q2c4s5ejr$, 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id, image_path = excluded.image_path, caption = excluded.caption, "order" = excluded."order";
