import { createAppError } from "@/lib/errors";
import { readJsonBody } from "@/lib/mcp/http";
import { parseChatStore } from "@/lib/storage/chat-storage";
import {
  loadChatStoreForWorkspace,
  saveChatStoreForWorkspace,
} from "@/lib/supabase/chat-repo";
import { handleStorageRoute } from "@/lib/supabase/route-handler";
import { ensureWorkspaceId } from "@/lib/supabase/workspace";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return handleStorageRoute(async () => {
    const workspaceId = await ensureWorkspaceId();
    const store = await loadChatStoreForWorkspace(workspaceId);
    return Response.json(store);
  });
}

export async function PUT(request: Request): Promise<Response> {
  return handleStorageRoute(async () => {
    const parsed = parseChatStore(await readJsonBody(request));
    if (!parsed) {
      throw createAppError("BAD_REQUEST", 400, "채팅 스토어 형식이 올바르지 않습니다.");
    }
    const workspaceId = await ensureWorkspaceId();
    await saveChatStoreForWorkspace(workspaceId, parsed);
    return Response.json({ ok: true });
  });
}
