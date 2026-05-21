-- work_records テーブル作成
create table if not exists public.work_records (
  id uuid default gen_random_uuid() primary key,
  work_order_no text not null,
  user_id uuid not null references auth.users(id),
  username text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- インデックス
create index if not exists work_records_started_at_idx on public.work_records (started_at desc);
create index if not exists work_records_user_id_idx on public.work_records (user_id);

-- RLS 有効化
alter table public.work_records enable row level security;

-- ポリシー：ログイン済みユーザーは全レコードを閲覧可能
create policy "Authenticated users can view all records"
  on public.work_records for select
  to authenticated
  using (true);

-- ポリシー：ログイン済みユーザーは自分のレコードを挿入可能
create policy "Users can insert own records"
  on public.work_records for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ポリシー：ログイン済みユーザーは自分のレコードを更新可能
create policy "Users can update own records"
  on public.work_records for update
  to authenticated
  using (auth.uid() = user_id);
