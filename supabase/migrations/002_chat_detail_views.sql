-- Table Editor에서 Q&A·생성 이미지를 행으로 보기 위한 뷰.
-- 원본은 chat_threads.messages JSONB를 유지한다.

create or replace view public.chat_messages
with (security_invoker = true) as
select
  t.workspace_id,
  t.id as thread_id,
  t.title as thread_title,
  (elem.ord - 1) as position,
  elem.value->>'id' as message_id,
  elem.value->>'role' as role,
  elem.value->>'content' as content,
  nullif(elem.value->>'createdAt', '')::bigint as created_at_ms,
  coalesce(jsonb_array_length(elem.value->'mcpResults'), 0) as mcp_result_count,
  elem.value->'mcpResults' as mcp_results
from public.chat_threads t
cross join lateral jsonb_array_elements(t.messages) with ordinality as elem(value, ord);

create or replace view public.chat_generated_images
with (security_invoker = true) as
select
  t.workspace_id,
  t.id as thread_id,
  t.title as thread_title,
  msg.value->>'id' as message_id,
  res.value->>'toolName' as tool_name,
  img.ord as image_index,
  img.value->>'mimeType' as mime_type,
  length(coalesce(img.value->>'src', '')) as src_bytes,
  left(coalesce(img.value->>'src', ''), 48) as src_preview,
  img.value->>'src' as src
from public.chat_threads t
cross join lateral jsonb_array_elements(t.messages) as msg(value)
cross join lateral jsonb_array_elements(coalesce(msg.value->'mcpResults', '[]'::jsonb)) as res(value)
cross join lateral jsonb_array_elements(coalesce(res.value->'images', '[]'::jsonb)) with ordinality as img(value, ord);
