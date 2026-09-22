-- Optional second customer phone on tattoo jobs.
alter table tattoo_requests add column if not exists customer_phone_2 text;
