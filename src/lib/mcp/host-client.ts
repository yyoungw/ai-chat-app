import type {
  McpCatalog,
  McpPrompt,
  McpResource,
  McpServerConfig,
  McpTool,
} from "@/lib/types/mcp";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/mcp-host/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as {
    code?: string;
    message?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "MCP 요청에 실패했습니다.");
  }

  return payload as T;
}

export async function connectHost(
  server: McpServerConfig,
  secrets?: { headers?: Record<string, string>; env?: Record<string, string> },
  options?: { persistSecrets?: boolean }
): Promise<McpCatalog> {
  const data = await postJson<{ catalog: McpCatalog }>("connect", {
    ...server,
    headers: secrets?.headers,
    env: secrets?.env,
    persistSecrets: options?.persistSecrets === true,
  });
  return data.catalog;
}

export async function disconnectHost(serverId: string): Promise<void> {
  await postJson("disconnect", { serverId });
}

export async function listHostSessions(): Promise<string[]> {
  const response = await fetch("/api/mcp-host/sessions", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as {
    serverIds?: unknown;
    message?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "MCP 세션 목록을 불러오지 못했습니다.");
  }

  if (!Array.isArray(payload?.serverIds)) return [];
  return payload.serverIds.filter((id): id is string => typeof id === "string");
}

export async function listTools(serverId: string): Promise<McpTool[]> {
  const data = await postJson<{ tools: McpTool[] }>("tools/list", { serverId });
  return data.tools;
}

export async function callTool(
  serverId: string,
  name: string,
  args: unknown
): Promise<unknown> {
  const data = await postJson<{ result: unknown }>("tools/call", {
    serverId,
    name,
    args,
  });
  return data.result;
}

export async function listPrompts(serverId: string): Promise<McpPrompt[]> {
  const data = await postJson<{ prompts: McpPrompt[] }>("prompts/list", {
    serverId,
  });
  return data.prompts;
}

export async function getPrompt(
  serverId: string,
  name: string,
  args: unknown
): Promise<unknown> {
  const data = await postJson<{ result: unknown }>("prompts/get", {
    serverId,
    name,
    args,
  });
  return data.result;
}

export async function listResources(serverId: string): Promise<McpResource[]> {
  const data = await postJson<{ resources: McpResource[] }>("resources/list", {
    serverId,
  });
  return data.resources;
}

export async function readResource(
  serverId: string,
  uri: string
): Promise<unknown> {
  const data = await postJson<{ result: unknown }>("resources/read", {
    serverId,
    uri,
  });
  return data.result;
}
