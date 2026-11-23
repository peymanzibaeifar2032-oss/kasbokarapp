-- Pocket «تقویم نوبت رنگی»: activation codes for the owner's contacts (local-only phones). Additive only.
-- kind = 'contact' marks a code issued from /studio/pocket-contacts. Like every non-self license it is only a
-- signed offline lease for local editing: it is never a site session and grants no access to owner data.
alter table pocket_licenses add column if not exists kind text not null default 'customer' check (kind in ('customer', 'contact'));
alter table pocket_licenses add column if not exists note text;
create index if not exists pocket_licenses_kind_idx on pocket_licenses (kind, created_at desc);
