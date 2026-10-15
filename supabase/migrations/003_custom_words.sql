-- 사용자가 직접 추가한 단어 (본인만 보임)
create table if not exists custom_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  word text not null check (length(word) between 1 and 80),
  pos text not null default '',
  meaning text not null check (length(meaning) between 1 and 200),
  example text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists custom_words_user_idx on custom_words (user_id, created_at);
create unique index if not exists custom_words_user_word_uq on custom_words (user_id, lower(word));

alter table custom_words enable row level security;
create policy "custom words own" on custom_words for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
