-- Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행하세요.

create table if not exists responses (
  id          bigserial primary key,
  session_id  text not null,
  q           int  not null,
  user_no     int  not null,
  user_name   text,
  choice      int,
  answer      text,
  updated_at  timestamptz default now(),
  unique (session_id, q, user_no)
);

alter table responses enable row level security;

-- 7명이 쓰는 일회성 모임이라 익명 접근을 열어둡니다.
create policy "read"   on responses for select using (true);
create policy "insert" on responses for insert with check (true);
create policy "update" on responses for update using (true) with check (true);

-- 실시간 반영을 켭니다.
alter publication supabase_realtime add table responses;


-- ── 토론이 끝난 뒤, 후기용으로 답안 전체를 뽑을 때 ──
-- select user_no, user_name, q + 1 as 질문, choice, answer
-- from responses
-- where session_id = '2026-08-29'
-- order by q, user_no;
