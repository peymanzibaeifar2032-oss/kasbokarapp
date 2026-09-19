alter table mehr_loan_leads
  add column if not exists branch_code text,
  add column if not exists province text,
  add column if not exists county text;

