-- ═══════════════════════════════════════════════════════════════
--  이벤트 접속 코드 시스템 — Supabase 1회 설정 SQL
--
--  실행 위치: Supabase 대시보드 → 프로젝트(qwsjofkabllbnbsgndun)
--             → SQL Editor → New query → 아래 전체 붙여넣고 RUN
--
--  하는 일:
--   1) access_codes 테이블 생성 (코드 ↔ 게임(ep) ↔ 만료일)
--   2) RLS: 마스터(pigi00@naver.com)만 발급/조회/삭제. 익명은 직접 못 읽음
--      (코드 문자열이 그대로 노출되지 않게 — 검증은 함수로만)
--   3) check_access_code(): 코드+게임이 유효한지 true/false만 반환
--   4) is_ep_gated(): 그 게임이 지금 '코드 전용'인지(활성 코드 존재?) 반환
--
--  마스터 계정: pigi00@naver.com 이 Supabase 회원가입(이메일/비번)되어
--  있어야 admin.html에서 발급할 수 있습니다. (사이트에서 한 번 가입하면 됨)
-- ═══════════════════════════════════════════════════════════════

-- 1) 테이블 ─────────────────────────────────────────────────────
create table if not exists public.access_codes (
  code        text primary key,          -- 입력 코드 (대문자)
  ep          integer not null,          -- 대상 게임 (kings.json의 ep: 1~27)
  expires_at  timestamptz,               -- 이 코드의 사용 마감(이벤트 종료일). null=무기한
  label       text,                      -- 메모(이벤트명 등)
  created_at  timestamptz not null default now()
);

create index if not exists access_codes_ep_idx on public.access_codes (ep);

-- 2) RLS ────────────────────────────────────────────────────────
alter table public.access_codes enable row level security;

-- 마스터만 모든 작업(조회/발급/삭제). 익명(anon)은 테이블 직접 접근 불가.
drop policy if exists "master full access" on public.access_codes;
create policy "master full access" on public.access_codes
  for all
  using      (auth.jwt() ->> 'email' = 'pigi00@naver.com')
  with check (auth.jwt() ->> 'email' = 'pigi00@naver.com');

-- 3) 코드 검증 함수 (SECURITY DEFINER → RLS 우회, boolean만 반환) ──
--    익명 사용자는 이 함수로만 검증. 코드 목록 자체는 못 읽음.
create or replace function public.check_access_code(p_code text, p_ep integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.access_codes
    where code = upper(btrim(p_code))
      and ep = p_ep
      and (expires_at is null or expires_at > now())
  );
$$;

-- 4) 이 게임이 '코드 전용'인지 (활성 코드가 1개 이상 있으면 게이트 ON) ─
create or replace function public.is_ep_gated(p_ep integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.access_codes
    where ep = p_ep
      and (expires_at is null or expires_at > now())
  );
$$;

-- 5) 익명/로그인 사용자에게 함수 실행 권한 부여 ────────────────────
grant execute on function public.check_access_code(text, integer) to anon, authenticated;
grant execute on function public.is_ep_gated(integer)            to anon, authenticated;

-- 끝. (되돌리려면: drop table public.access_codes cascade;
--       drop function check_access_code; drop function is_ep_gated;)
