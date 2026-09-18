-- chat_threads.messages JSONB를 행 단위 테이블로 정규화한다.
-- 기존 뷰(chat_messages, chat_generated_images)는 테이블과 이름이 겹쳐 제거한다.

drop view if exists public.chat_generated_images cascade;
drop view if exists public.chat_messages cascade;

create table public.chat_messages (
  workspace_id uuid not null,
  thread_id text not null,
  id text not null,
  position integer not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  created_at_ms bigint not null,
  mcp_results jsonb,
  primary key (workspace_id, thread_id, id),
  unique (workspace_id, thread_id, position),
  foreign key (workspace_id, thread_id)
    references public.chat_threads (workspace_id, id)
    on delete cascade
);

create table public.chat_images (
  workspace_id uuid not null,
  thread_id text not null,
  message_id text not null,
  image_index integer not null,
  tool_name text,
  mime_type text,
  src text not null,
  primary key (workspace_id, thread_id, message_id, image_index),
  foreign key (workspace_id, thread_id, message_id)
    references public.chat_messages (workspace_id, thread_id, id)
    on delete cascade
);
