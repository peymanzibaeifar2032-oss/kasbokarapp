-- Phase 2 search. verification_level is independent of approval_status.
-- Completeness is computed in app code and is never a visibility gate.
-- ranking_fresh_at is only bumped on meaningful listing events, not every save.

alter table businesses
  add column if not exists verification_level text not null default 'unverified';

alter table businesses
  add column if not exists verification_evidence jsonb not null default '{}'::jsonb;

alter table businesses
  add column if not exists ranking_fresh_at timestamptz;

update businesses
   set ranking_fresh_at = created_at
 where ranking_fresh_at is null;

-- Mint "basic" only when listing-location evidence exists.
-- Never contact_verified / ownership_verified / identity_verified here.
update businesses
   set verification_level = 'basic',
       verification_evidence = jsonb_build_object('source', 'listing_fields', 'phase', 2)
 where verification_level = 'unverified'
   and char_length(trim(name)) >= 2
   and category_id is not null
   and char_length(trim(city)) >= 2
   and char_length(trim(province)) >= 2
   and latitude between 24.5 and 40.5
   and longitude between 43.5 and 64;

alter table businesses drop constraint if exists businesses_verification_level_chk;
alter table businesses
  add constraint businesses_verification_level_chk
  check (verification_level in (
    'unverified',
    'basic',
    'contact_verified',
    'ownership_verified',
    'identity_verified'
  ));

create index if not exists businesses_visible_lookup_idx
  on businesses (approval_status, is_active);

create index if not exists reviews_business_id_idx
  on reviews (business_id);
