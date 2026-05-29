-- Habit Tracker tables

create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  color       text not null default '#00f2fe',
  emoji       text,
  created_at  timestamptz default now() not null,
  is_archived boolean default false not null
);

create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid references public.habits(id) on delete cascade not null,
  date       date not null,
  created_at timestamptz default now() not null,
  unique(habit_id, date)
);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "habits: own" on public.habits
  for all using (auth.uid() = user_id);

create policy "habit_logs: own" on public.habit_logs
  for all using (
    habit_id in (select id from public.habits where user_id = auth.uid())
  );
