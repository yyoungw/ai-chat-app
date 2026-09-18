import { connectHost, listHostSessions } from "@/lib/mcp/host-client";
import { mcpReconnectBlockedReason } from "@/lib/mcp/reachability";
import {
  loadDesiredConnections,
  saveDesiredConnections,
} from "@/lib/storage/mcp-storage";
import type { McpConnectionStatus, McpServerConfig } from "@/lib/types/mcp";

export type RestoredConnection = {
  status: McpConnectionStatus;
  error: string | null;
};

/** 살아 있는 세션과 사용자가 연결해 둔 id를 맞춰, 끊긴 것만 다시 connect한다. */
export async function restoreDesiredSessions(
  servers: McpServerConfig[],
  onUpdate?: (next: Record<string, RestoredConnection>) => void
): Promise<Record<string, RestoredConnection>> {
  const known = new Map(servers.map((server) => [server.id, server]));
  const desired = loadDesiredConnections().filter((id) => known.has(id));

  let live: string[] = [];
  try {
    live = (await listHostSessions()).filter((id) => known.has(id));
  } catch {
    live = [];
  }

  const remembered = [...new Set([...desired, ...live])];
  saveDesiredConnections(remembered);

  const next: Record<string, RestoredConnection> = {};
  for (const id of live) {
    next[id] = { status: "connected", error: null };
  }
  const missing = remembered.filter((id) => !live.includes(id));
  for (const id of missing) {
    const server = known.get(id);
    const blocked = server ? mcpReconnectBlockedReason(server) : null;
    next[id] = blocked
      ? { status: "error", error: blocked }
      : { status: "connecting", error: null };
  }
  onUpdate?.({ ...next });

  for (const id of missing) {
    const server = known.get(id);
    if (!server || mcpReconnectBlockedReason(server)) continue;
    try {
      await connectHost(server);
      next[id] = { status: "connected", error: null };
    } catch (err: unknown) {
      next[id] = {
        status: "error",
        error:
          err instanceof Error ? err.message : "다시 연결하지 못했습니다.",
      };
    }
    onUpdate?.({ ...next });
  }

  return next;
}
