-- ============================================================
-- 留言板数据库结构（Supabase / PostgreSQL）
-- ------------------------------------------------------------
-- 使用方法：
--   1. 登录 https://supabase.com/dashboard 创建项目（免费）
--   2. 打开项目的 SQL Editor，粘贴本文件全部内容并运行
-- 说明：
--   - 游客无需登录即可读取和发表留言（公开留言板）
--   - 已开启行级安全（RLS），仅开放 select / insert
--   - 底部测试数据可直接运行；正式上线前可清空
-- ============================================================

-- 1. 建表：留言
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 20),
  content text not null check (char_length(content) between 1 and 500),
  email text check (email is null or email = '' or char_length(email) <= 60),
  created_at timestamptz not null default now()
);

comment on table public.messages is '个人网站留言板';
comment on column public.messages.name is '昵称';
comment on column public.messages.content is '留言内容';
comment on column public.messages.email is '选填邮箱（仅前端格式校验）';

-- 2. 开启行级安全（RLS）
alter table public.messages enable row level security;

-- 3. 游客可读取全部留言
drop policy if exists "messages_select_public" on public.messages;
create policy "messages_select_public"
  on public.messages for select
  to anon, authenticated
  using (true);

-- 4. 游客可发表留言（无需登录）
drop policy if exists "messages_insert_public" on public.messages;
create policy "messages_insert_public"
  on public.messages for insert
  to anon, authenticated
  with check (true);

-- 5. 确保 Data API（REST）可访问：部分项目需显式授权 anon/authenticated
grant select, insert on public.messages to anon, authenticated;

-- 6. 开启实时推送：新留言无需刷新即可出现在页面
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- 7. 测试数据（上线前可删除，或直接清空表：delete from public.messages;）
insert into public.messages (name, content, email, created_at) values
  ('路过的小明', '第一次来，网站做得很清爽，留言板也安排上了 👍', null, now() - interval '3 days'),
  ('前端同学', '博主加油！期待分享更多项目～', 'demo@example.com', now() - interval '1 day'),
  ('测试用户', '这是从数据库读取的测试数据，前端已与 Supabase 打通。', null, now() - interval '2 hours');