-- 사용자 프로필 (닉네임)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);

-- 단어별 학습 상태 (단어 데이터 자체는 앱 코드 src/data/words.ts 에 있음)
create table if not exists word_progress (
  user_id uuid not null references auth.users on delete cascade,
  word_id text not null,
  correct int not null default 0,
  wrong int not null default 0,
  starred boolean not null default false,  -- 오답노트/즐겨찾기
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

-- 퀴즈 기록
create table if not exists quiz_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  set_id text not null,
  mode text not null,
  score int not null,
  total int not null,
  created_at timestamptz not null default now()
);
create index if not exists quiz_results_user_idx on quiz_results (user_id, created_at desc);

alter table profiles enable row level security;
alter table word_progress enable row level security;
alter table quiz_results enable row level security;

-- 프로필: 랭킹 표시용으로 로그인 사용자 전체 읽기 허용, 수정은 본인만
create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles write own" on profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on profiles for update to authenticated using (id = auth.uid());

create policy "progress own" on word_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 퀴즈 기록: 본인 것만 쓰기, 읽기는 랭킹용으로 전체 허용
create policy "results read" on quiz_results for select to authenticated using (true);
create policy "results insert own" on quiz_results for insert to authenticated with check (user_id = auth.uid());

-- 회원가입 시 프로필 자동 생성 (signUp options.data.nickname 사용)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- 주간 랭킹 (최근 7일 퀴즈 맞힌 개수 합)
create or replace view weekly_ranking with (security_invoker = true) as
select p.id as user_id, p.nickname, coalesce(sum(r.score), 0)::int as points, count(r.id)::int as quizzes
from profiles p
join quiz_results r on r.user_id = p.id and r.created_at > now() - interval '7 days'
group by p.id, p.nickname
order by points desc
limit 20;
