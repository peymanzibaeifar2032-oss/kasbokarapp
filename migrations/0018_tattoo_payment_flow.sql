-- Tattoo proposal hold and manual receipt review.
alter table tattoo_requests add column if not exists payment_status text not null default 'not_required';
alter table tattoo_requests add column if not exists payment_hold_until timestamptz;
alter table tattoo_requests add column if not exists payment_submitted_at timestamptz;
alter table tattoo_requests add column if not exists payment_review_deadline timestamptz;
alter table tattoo_requests add column if not exists receipt_image text;
alter table tattoo_requests add column if not exists payment_iban text;
alter table tattoo_requests add column if not exists payment_card_number text;
alter table business_settlement_accounts add column if not exists card_number text;
alter table tattoo_requests drop constraint if exists tattoo_requests_payment_status_chk;
alter table tattoo_requests add constraint tattoo_requests_payment_status_chk check (payment_status in ('not_required','awaiting_payment','receipt_submitted','approved','rejected','expired'));
create index if not exists tattoo_requests_payment_hold_idx on tattoo_requests (payment_status, payment_hold_until);
