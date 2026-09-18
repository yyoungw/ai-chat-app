import "server-only";

import { createAppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { parseMcpSnapshot } from "@/lib/storage/mcp-storage";
import type { McpPersistSnapshot, McpSessionSecrets } from "@/lib/types/mcp";

const EMPTY_SNAPSHOT: McpPersistSnapshot = {
  version: 1,
  servers: [],
  desiredConnections: [],
  disabledChatTools: [],
  secretFlags: {},
};

function asStringRecord(value: Json | null): Record<string, string> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.trim()) next[key] = item;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export async function loadMcpSnapshotForWorkspace(
  workspaceId: string
): Promise<McpPersistSnapshot> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("load_mcp_store", {
    p_workspace_id: workspaceId,
  });
  if (error) {
    throw createAppError("SERVER_ERROR", 500, "MCP 설정을 불러오지 못했습니다.");
  }
  return parseMcpSnapshot(data) ?? { ...EMPTY_SNAPSHOT, servers: [] };
}

export async function saveMcpSnapshotForWorkspace(
  workspaceId: string,
  snapshot: Pick<
    McpPersistSnapshot,
    "servers" | "desiredConnections" | "disabledChatTools"
  >
): Promise<void> {
  const parsed = parseMcpSnapshot({
    version: 1,
    servers: snapshot.servers,
    desiredConnections: snapshot.desiredConnections,
    disabledChatTools: snapshot.disabledChatTools,
    secretFlags: {},
  });
  if (!parsed) {
    throw createAppError("BAD_REQUEST", 400, "MCP 스토어 형식이 올바르지 않습니다.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("save_mcp_store", {
    p_workspace_id: workspaceId,
    p_servers: parsed.servers as unknown as Json,
    p_desired_ids: parsed.desiredConnections,
    p_disabled_tools: parsed.disabledChatTools,
  });
  if (error) {
    throw createAppError("SERVER_ERROR", 500, "MCP 설정을 저장하지 못했습니다.");
  }
}

/** 시크릿 값은 로그에 남기지 않는다. */
export async function loadMcpSecrets(
  workspaceId: string,
  serverId: string
): Promise<McpSessionSecrets | undefined> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mcp_servers")
    .select("headers, env")
    .eq("workspace_id", workspaceId)
    .eq("id", serverId)
    .maybeSingle();
  if (error) {
    throw createAppError("SERVER_ERROR", 500, "MCP 시크릿을 불러오지 못했습니다.");
  }
  if (!data) return undefined;

  const headers = asStringRecord(data.headers);
  const env = asStringRecord(data.env);
  if (!headers && !env) return undefined;
  return { headers, env };
}

export async function saveMcpSecrets(
  workspaceId: string,
  serverId: string,
  secrets: McpSessionSecrets
): Promise<void> {
  const headers = secrets.headers ?? null;
  const env = secrets.env ?? null;
  if (!headers && !env) return;

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("mcp_servers")
    .update({
      headers,
      env,
      updated_at_ms: Date.now(),
    })
    .eq("workspace_id", workspaceId)
    .eq("id", serverId);
  if (error) {
    throw createAppError("SERVER_ERROR", 500, "MCP 시크릿을 저장하지 못했습니다.");
  }
}
