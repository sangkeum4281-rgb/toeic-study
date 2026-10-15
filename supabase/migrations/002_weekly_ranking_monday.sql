-- 주간 랭킹: 최근 7일 → 이번 주 (한국 시간 월요일 00:00부터) 맞힌 개수 합
-- Postgres date_trunc('week')는 월요일 시작
create or replace view weekly_ranking with (security_invoker = true) as
select p.id as user_id, p.nickname, coalesce(sum(r.score), 0)::int as points, count(r.id)::int as quizzes
from profiles p
join quiz_results r on r.user_id = p.id
  and r.created_at >= date_trunc('week', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'
group by p.id, p.nickname
order by points desc
limit 20;
