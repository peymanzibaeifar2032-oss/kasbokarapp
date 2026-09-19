-- Artist-proposed tattoo appointment. The six-hour payment hold starts only
-- after the customer accepts the proposed appointment.
alter table tattoo_requests add column if not exists proposed_slot_start timestamptz;
alter table tattoo_requests add column if not exists proposed_slot_end timestamptz;

alter table tattoo_requests drop constraint if exists tattoo_requests_payment_status_chk;
alter table tattoo_requests add constraint tattoo_requests_payment_status_chk check (
  payment_status in ('not_required','proposal_pending','awaiting_payment','receipt_submitted','approved','rejected','expired')
);

create index if not exists tattoo_requests_proposed_slot_idx
  on tattoo_requests (business_id, proposed_slot_start)
  where status = 'approved';
