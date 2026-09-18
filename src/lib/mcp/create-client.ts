import "server-only";

import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/client/stdio";

import { createAppError } from "@/lib/errors";
import type { McpServerConfig } from "@/lib/types/mcp";

export type McpConnectSecrets = {
  headers?: Record<string, string>;
  env?: Record<string, string>;
};

function resolveStdioCommand(command: string): string {
  if (process.platform === "win32" && command === "npx") {
    return "npx.cmd";
  }
  return command;
}

/** transport에 맞는 MCP Client를 만들고 initialize 한다. */
export async function createAndConnectClient(
  server: McpServerConfig,
  secrets?: McpConnectSecrets
): Promise<Client> {
  const client = new Client({
    name: "ai-chat-app",
    version: "0.1.0",
  });

  if (server.transport === "streamable-http") {
    const url = server.url?.trim();
    if (!url) {
      throw createAppError("BAD_REQUEST", 400, "Streamable HTTP URL이 없습니다.");
    }

    const headers = secrets?.headers;
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: headers && Object.keys(headers).length > 0 ? { headers } : undefined,
    });

    try {
      await client.connect(transport, { timeout: 20_000 });
      return client;
    } catch (error) {
      await client.close().catch(() => undefined);
      throw error;
    }
  }

  const command = server.command?.trim();
  if (!command) {
    throw createAppError("BAD_REQUEST", 400, "stdio command가 없습니다.");
  }

  const extraEnv = secrets?.env;
  const transport = new StdioClientTransport({
    command: resolveStdioCommand(command),
    args: server.args ?? [],
    env: extraEnv
      ? { ...getDefaultEnvironment(), ...extraEnv }
      : undefined,
    stderr: "pipe",
  });

  try {
    await client.connect(transport, { timeout: 20_000 });
    return client;
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
}
