import "server-only";

import type { Client } from "@modelcontextprotocol/client";
import type { McpServerConfig } from "@/lib/types/mcp";

export type McpSession = {
  server: McpServerConfig;
  client: Client;
};

const globalForSessions = globalThis as unknown as {
  __mcpHostSessions?: Map<string, McpSession>;
};

function sessions(): Map<string, McpSession> {
  if (!globalForSessions.__mcpHostSessions) {
    globalForSessions.__mcpHostSessions = new Map();
  }
  return globalForSessions.__mcpHostSessions;
}

export function getSession(serverId: string): McpSession | undefined {
  return sessions().get(serverId);
}

export function listSessions(): McpSession[] {
  return [...sessions().values()];
}

export async function setSession(session: McpSession): Promise<void> {
  const existing = sessions().get(session.server.id);
  if (existing && existing.client !== session.client) {
    await closeQuietly(existing.client);
  }
  sessions().set(session.server.id, session);
}

export async function removeSession(serverId: string): Promise<void> {
  const existing = sessions().get(serverId);
  sessions().delete(serverId);
  if (existing) {
    await closeQuietly(existing.client);
  }
}

async function closeQuietly(client: Client): Promise<void> {
  try {
    await client.close();
  } catch {
    // 이미 끊긴 세션
  }
}
