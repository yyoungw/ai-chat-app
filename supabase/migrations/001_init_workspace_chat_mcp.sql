-- 워크스페이스 단위 채팅/MCP persist 스키마.
-- 원격 적용: Supabase MCP apply_migration (init_workspace_chat_mcp)

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.workspace_prefs (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  chat_store_version integer not null default 2,
  active_thread_id text,
  mcp_store_version integer not null default 1
);

-- ChatThread. createdAt/updatedAt는 epoch ms, messages는 ChatMessage[] JSON.
create table if not exists public.chat_threads (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  title text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  primary key (workspace_id, id),
  constraint chat_threads_messages_is_array check (jsonb_typeof(messages) = 'array')
);

-- McpServerConfig 메타. 시크릿은 mcp_server_secrets.
create table if not exists public.mcp_servers (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null,
  name text not null,
  transport text not null check (transport in ('stdio', 'streamable-http')),
  command text,
  args text[],
  url text,
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  primary key (workspace_id, id)
);

create table if not exists public.mcp_server_secrets (
  workspace_id uuid not null,
  server_id text not null,
  headers jsonb,
  env jsonb,
  updated_at_ms bigint not null,
  primary key (workspace_id, server_id),
  foreign key (workspace_id, server_id)
    references public.mcp_servers (workspace_id, id)
    on delete cascade
);

create table if not exists public.mcp_desired_connections (
  workspace_id uuid not null,
  server_id text not null,
  primary key (workspace_id, server_id),
  foreign key (workspace_id, server_id)
    references public.mcp_servers (workspace_id, id)
    on delete cascade
);

create table if not exists public.mcp_disabled_chat_tools (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tool_key text not null,
  primary key (workspace_id, tool_key)
);
