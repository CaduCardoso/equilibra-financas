create table if not exists public.entitlements (
  email text primary key,
  plan text not null check (plan in ('evolui', 'anual', 'planilha')),
  status text not null check (status in ('active', 'cancelling', 'inactive')),
  access_ends_at timestamptz,
  vendria_order_id text,
  vendria_subscription_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  event_id text primary key,
  event_type text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;
alter table public.webhook_events enable row level security;

create policy "Usuário consulta o próprio acesso"
on public.entitlements for select
to authenticated
using (lower(email) = lower((select auth.jwt() ->> 'email')));

grant select on public.entitlements to authenticated;
revoke all on public.webhook_events from anon, authenticated;
