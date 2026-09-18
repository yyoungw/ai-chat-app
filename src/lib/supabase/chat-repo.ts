import "server-only";

import { createAppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { parseChatStore } from "@/lib/storage/chat-storage";
import type { ChatStore } from "@/lib/types/chat";

const EMPTY_STORE: ChatStore = {
  version: 2,
  activeId: null,
  threads: [],
};

export async function loadChatStoreForWorkspace(
  workspaceId: string
): Promise<ChatStore> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("load_chat_store", {
    p_workspace_id: workspaceId,
  });
  if (error) {
    throw createAppError("SERVER_ERROR", 500, "채팅 기록을 불러오지 못했습니다.");
  }
  return parseChatStore(data) ?? { ...EMPTY_STORE, threads: [] };
}

export async function saveChatStoreForWorkspace(
  workspaceId: string,
  store: ChatStore
): Promise<void> {
  const parsed = parseChatStore(store);
  if (!parsed) {
    throw createAppError("BAD_REQUEST", 400, "채팅 스토어 형식이 올바르지 않습니다.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("save_chat_store", {
    p_workspace_id: workspaceId,
    p_active_thread_id: parsed.activeId,
    p_threads: parsed.threads as unknown as Json,
  });
  if (error) {
    throw createAppError("SERVER_ERROR", 500, "채팅 기록을 저장하지 못했습니다.");
  }
}

export async function workspaceHasData(workspaceId: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("workspace_has_data", {
    p_workspace_id: workspaceId,
  });
  if (error) {
    throw createAppError("SERVER_ERROR", 500, "워크스페이스 상태를 확인하지 못했습니다.");
  }
  return data === true;
}
