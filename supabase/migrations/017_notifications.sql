-- 017: Notificaciones in-app (alertas de wantlist y futuros avisos)
-- La lectura/actualización es solo del dueño (RLS). Los inserts los hace el
-- server con service role (avisos a terceros, p. ej. \"una carta de tu wantlist
-- se publicó\"), por eso no hay policy de insert.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_notifications_user
  on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications select own"
  on public.notifications
  for select
  using (auth.uid() = user_id);

create policy "notifications update own"
  on public.notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications delete own"
  on public.notifications
  for delete
  using (auth.uid() = user_id);
