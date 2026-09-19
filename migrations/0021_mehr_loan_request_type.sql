alter table mehr_loan_leads
  add column if not exists request_type text not null default 'sell';

alter table mehr_loan_leads
  drop constraint if exists mehr_loan_leads_request_type_chk;

alter table mehr_loan_leads
  add constraint mehr_loan_leads_request_type_chk
  check (request_type in ('buy', 'sell'));

