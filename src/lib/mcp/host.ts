import "server-only";

import { createAppError, mapProviderError, type AppError } from "@/lib/errors";
import {
  createAndConnectClient,
  type McpConnectSecrets,
} from "@/lib/mcp/create-client";
import { mcpReconnectBlockedReason } from "@/lib/mcp/reachability";
import { logMcp, secretKeys } from "@/lib/mcp/log";
import {
  getSession,
  listSessions,
  removeSession,
  setSession,
} from "@/lib/mcp/session-store";
import type {
  McpCatalog,
  McpPrompt,
  McpResource,
  McpServerConfig,
  McpTool,
} from "@/lib/types/mcp";

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "status" in error
  );
}

function mapMcpError(error: unknown): AppError {
  if (isAppError(error)) return error;
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();
  if (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("fetch") ||
    lower.includes("econnrefused")
  ) {
    return createAppError(
      "NETWORK_ERROR",
      503,
      "MCP 서버에 연결하지 못했습니다. URL과 실행 여부를 확인하세요."
    );
  }
  return mapProviderError(error);
}

function requireClient(serverId: string) {
  const session = getSession(serverId);
  if (!session) {
    throw createAppError("BAD_REQUEST", 400, "서버가 연결되어 있지 않습니다.");
  }
  return session;
}

function toTool(raw: { name: string; description?: string; inputSchema?: unknown }): McpTool {
  return {
    name: raw.name,
    description: raw.description ?? "",
    inputSchema:
      raw.inputSchema && typeof raw.inputSchema === "object"
        ? (raw.inputSchema as Record<string, unknown>)
        : undefined,
  };
}

function toPrompt(raw: {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}): McpPrompt {
  return {
    name: raw.name,
    description: raw.description ?? "",
    arguments: raw.arguments,
  };
}

function toResource(raw: {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}): McpResource {
  return {
    uri: raw.uri,
    name: raw.name ?? raw.uri,
    description: raw.description,
    mimeType: raw.mimeType,
  };
}

export async function connectHost(
  server: McpServerConfig,
  secrets?: McpConnectSecrets
): Promise<McpCatalog> {
  const blocked = mcpReconnectBlockedReason(server);
  if (blocked) {
    throw createAppError("BAD_REQUEST", 400, blocked);
  }

  try {
    logMcp("connect", {
      serverId: server.id,
      transport: server.transport,
      url: server.url,
      command: server.command,
      headerKeys: secretKeys(secrets?.headers),
      envKeys: secretKeys(secrets?.env),
    });
    const client = await createAndConnectClient(server, secrets);
    await setSession({ server, client });
    return {
      tools: await listTools(server.id),
      prompts: await listPrompts(server.id),
      resources: await listResources(server.id),
    };
  } catch (error) {
    await removeSession(server.id);
    throw mapMcpError(error);
  }
}

export async function disconnectHost(serverId: string): Promise<void> {
  await removeSession(serverId);
}

export async function listTools(serverId: string): Promise<McpTool[]> {
  try {
    const { client } = requireClient(serverId);
    const { tools } = await client.listTools();
    return tools.map(toTool);
  } catch (error) {
    throw mapMcpError(error);
  }
}

export async function callTool(
  serverId: string,
  name: string,
  args: unknown
): Promise<unknown> {
  try {
    const { client } = requireClient(serverId);
    const argumentsRecord =
      args && typeof args === "object" && !Array.isArray(args)
        ? (args as Record<string, unknown>)
        : {};
    return await client.callTool({ name, arguments: argumentsRecord });
  } catch (error) {
    throw mapMcpError(error);
  }
}

export async function listPrompts(serverId: string): Promise<McpPrompt[]> {
  try {
    const { client } = requireClient(serverId);
    const { prompts } = await client.listPrompts();
    return prompts.map(toPrompt);
  } catch (error) {
    if (isUnsupported(error)) return [];
    throw mapMcpError(error);
  }
}

export async function getPrompt(
  serverId: string,
  name: string,
  args: unknown
): Promise<unknown> {
  try {
    const { client } = requireClient(serverId);
    const argumentsRecord =
      args && typeof args === "object" && !Array.isArray(args)
        ? (args as Record<string, string>)
        : undefined;
    return await client.getPrompt({
      name,
      ...(argumentsRecord ? { arguments: argumentsRecord } : {}),
    });
  } catch (error) {
    throw mapMcpError(error);
  }
}

export async function listResources(serverId: string): Promise<McpResource[]> {
  try {
    const { client } = requireClient(serverId);
    const { resources } = await client.listResources();
    return resources.map(toResource);
  } catch (error) {
    if (isUnsupported(error)) return [];
    throw mapMcpError(error);
  }
}

export async function readResource(
  serverId: string,
  uri: string
): Promise<unknown> {
  try {
    const { client } = requireClient(serverId);
    return await client.readResource({ uri });
  } catch (error) {
    throw mapMcpError(error);
  }
}

export function connectedServers(): McpServerConfig[] {
  return listSessions().map((session) => session.server);
}

function isUnsupported(error: unknown): boolean {
  const anyErr = error as { code?: number | string; message?: string };
  if (anyErr?.code === -32601 || anyErr?.code === "MethodNotFound") return true;
  const message = (anyErr?.message ?? "").toLowerCase();
  return (
    message.includes("method not found") ||
    message.includes("not supported") ||
    message.includes("does not support")
  );
}
