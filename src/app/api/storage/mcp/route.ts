import { createAppError } from "@/lib/errors";
import { asRecord, readJsonBody } from "@/lib/mcp/http";
import { parseMcpSnapshot } from "@/lib/storage/mcp-storage";
import {
  loadMcpSnapshotForWorkspace,
  saveMcpSnapshotForWorkspace,
} from "@/lib/supabase/mcp-repo";
import { handleStorageRoute } from "@/lib/supabase/route-handler";
import { ensureWorkspaceId } from "@/lib/supabase/workspace";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return handleStorageRoute(async () => {
    const workspaceId = await ensureWorkspaceId();
    const snapshot = await loadMcpSnapshotForWorkspace(workspaceId);
    return Response.json(snapshot);
  });
}

export async function PUT(request: Request): Promise<Response> {
  return handleStorageRoute(async () => {
    const body = asRecord(await readJsonBody(request));
    const parsed = parseMcpSnapshot({
      version: 1,
      servers: body?.servers,
      desiredConnections: body?.desiredConnections,
      disabledChatTools: body?.disabledChatTools,
      secretFlags: {},
    });
    if (!parsed) {
      throw createAppError("BAD_REQUEST", 400, "MCP 스토어 형식이 올바르지 않습니다.");
    }
    const workspaceId = await ensureWorkspaceId();
    await saveMcpSnapshotForWorkspace(workspaceId, parsed);
    return Response.json({ ok: true });
  });
}
