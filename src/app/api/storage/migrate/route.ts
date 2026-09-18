import { asRecord, readJsonBody } from "@/lib/mcp/http";
import { parseChatStore } from "@/lib/storage/chat-storage";
import { parseMcpSnapshot } from "@/lib/storage/mcp-storage";
import {
  loadChatStoreForWorkspace,
  saveChatStoreForWorkspace,
  workspaceHasData,
} from "@/lib/supabase/chat-repo";
import {
  loadMcpSnapshotForWorkspace,
  saveMcpSnapshotForWorkspace,
} from "@/lib/supabase/mcp-repo";
import { handleStorageRoute } from "@/lib/supabase/route-handler";
import { ensureWorkspaceId } from "@/lib/supabase/workspace";
import type { ChatStore } from "@/lib/types/chat";
import type { McpPersistSnapshot } from "@/lib/types/mcp";

export const runtime = "nodejs";

function hasChatPayload(store: ChatStore | null): store is ChatStore {
  return Boolean(store && store.threads.length > 0);
}

function hasMcpPayload(snapshot: McpPersistSnapshot | null): snapshot is McpPersistSnapshot {
  if (!snapshot) return false;
  return (
    snapshot.servers.length > 0 ||
    snapshot.desiredConnections.length > 0 ||
    snapshot.disabledChatTools.length > 0
  );
}

export async function POST(request: Request): Promise<Response> {
  return handleStorageRoute(async () => {
    const body = asRecord(await readJsonBody(request)) ?? {};
    const chat = parseChatStore(body.chat);
    const mcpRaw = asRecord(body.mcp);
    const mcp = parseMcpSnapshot({
      version: 1,
      servers: mcpRaw?.servers ?? [],
      desiredConnections: mcpRaw?.desiredConnections ?? [],
      disabledChatTools: mcpRaw?.disabledChatTools ?? [],
      secretFlags: {},
    });

    const workspaceId = await ensureWorkspaceId();
    const exists = await workspaceHasData(workspaceId);

    // 이미 DB에 데이터가 있으면 덮어쓰지 않는다.
    if (!exists) {
      if (hasChatPayload(chat)) {
        await saveChatStoreForWorkspace(workspaceId, chat);
      }
      if (hasMcpPayload(mcp)) {
        await saveMcpSnapshotForWorkspace(workspaceId, mcp);
      }
    }

    const [nextChat, nextMcp] = await Promise.all([
      loadChatStoreForWorkspace(workspaceId),
      loadMcpSnapshotForWorkspace(workspaceId),
    ]);

    return Response.json({ chat: nextChat, mcp: nextMcp });
  });
}
