-- 9개 테이블을 4개로 합친다.
-- workspaces, chat_threads, chat_messages, mcp_servers
-- 삭제: workspace_prefs, mcp_server_secrets, mcp_desired_connections,
--       mcp_disabled_chat_tools, chat_images

alter table public.workspaces
  add column if not exists active_thread_id text,
  add column if not exists chat_store_version integer not null default 2,
  add column if not exists mcp_store_version integer not null default 1,
  add column if not exists disabled_chat_tools text[] not null default '{}';

alter table public.mcp_servers
  add column if not exists headers jsonb,
  add column if not exists env jsonb,
  add column if not exists desired boolean not null default false;
