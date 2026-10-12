create table if not exists tattoo_chat (
  id text primary key,
  phone text not null,
  request_id text,
  from_side text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint tattoo_chat_side_chk check (from_side in ('customer', 'desk'))
);

create index if not exists tattoo_chat_phone_idx on tattoo_chat (phone, created_at);
