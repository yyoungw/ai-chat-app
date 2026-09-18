import "server-only";

import type { FunctionCall, FunctionDeclaration, Part } from "@google/genai";

import { chatToolKey } from "@/lib/mcp/chat-tool-key";
import { callTool, listTools } from "@/lib/mcp/host";
import { listSessions } from "@/lib/mcp/session-store";
import { parseMcpToolResult, type McpImagePart } from "@/lib/mcp/tool-content";

export const MAX_MCP_TOOL_LOOPS = 5;

export type GeminiMcpBinding = {
  geminiName: string;
  serverId: string;
  serverName: string;
  toolName: string;
};

export type McpStreamEvent = {
  type: "mcp";
  serverName: string;
  toolName: string;
  status: "running" | "success" | "error";
  result?: unknown;
  args?: unknown;
  images?: McpImagePart[];
};

function sanitize(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_.:-]/g, "_");
  return cleaned || "x";
}

function toGeminiName(serverId: string, toolName: string): string {
  const raw = `s_${sanitize(serverId.slice(0, 8))}_${sanitize(toolName)}`;
  const named = /^[a-zA-Z_]/.test(raw) ? raw : `m_${raw}`;
  return named.slice(0, 128);
}

export type EnabledMcpTool = {
  serverId: string;
  toolName: string;
};

/** 연결 중인 세션 tools를 Gemini functionDeclarations로 변환한다. */
export async function loadGeminiMcpTools(
  enabledTools?: EnabledMcpTool[]
): Promise<{
  declarations: FunctionDeclaration[];
  bindings: Map<string, GeminiMcpBinding>;
}> {
  const bindings = new Map<string, GeminiMcpBinding>();
  const declarations: FunctionDeclaration[] = [];
  // 빈 배열 = 이번 요청에서 tools 없음. undefined = 연결된 서버의 전부.
  if (Array.isArray(enabledTools) && enabledTools.length === 0) {
    return { declarations, bindings };
  }
  const allowed = enabledTools
    ? new Set(
        enabledTools.map((tool) => chatToolKey(tool.serverId, tool.toolName))
      )
    : null;

  for (const session of listSessions()) {
    let tools: Awaited<ReturnType<typeof listTools>>;
    try {
      tools = await listTools(session.server.id);
    } catch {
      continue;
    }

    for (const tool of tools) {
      if (
        allowed &&
        !allowed.has(chatToolKey(session.server.id, tool.name))
      ) {
        continue;
      }
      let geminiName = toGeminiName(session.server.id, tool.name);
      let suffix = 2;
      while (bindings.has(geminiName)) {
        geminiName = `${toGeminiName(session.server.id, tool.name)}_${suffix}`.slice(
          0,
          128
        );
        suffix += 1;
      }

      bindings.set(geminiName, {
        geminiName,
        serverId: session.server.id,
        serverName: session.server.name,
        toolName: tool.name,
      });
      declarations.push({
        name: geminiName,
        description: `[${session.server.name}] ${tool.description || tool.name}`,
        parametersJsonSchema: tool.inputSchema ?? {
          type: "object",
          properties: {},
        },
      });
    }
  }

  return { declarations, bindings };
}

export function stringifyMcpResult(result: unknown): string {
  return truncate(parseMcpToolResult(result).text);
}

function truncate(text: string): string {
  return text.length > 8000 ? `${text.slice(0, 8000)}…` : text;
}

export async function executeGeminiFunctionCall(
  call: FunctionCall,
  bindings: Map<string, GeminiMcpBinding>
): Promise<{ event: McpStreamEvent; part: Part }> {
  const name = call.name ?? "";
  const binding = bindings.get(name);

  if (!binding) {
    const message = "알 수 없는 MCP tool입니다.";
    return {
      event: {
        type: "mcp",
        serverName: "MCP",
        toolName: name || "tool",
        status: "error",
        result: message,
        args: call.args,
      },
      part: {
        functionResponse: {
          name,
          ...(call.id ? { id: call.id } : {}),
          response: { error: message },
        },
      },
    };
  }

  try {
    const result = await callTool(
      binding.serverId,
      binding.toolName,
      call.args ?? {}
    );
    const parsed = parseMcpToolResult(result);
    const text = stringifyMcpResult(result);
    const isError =
      typeof result === "object" &&
      result !== null &&
      "isError" in result &&
      Boolean((result as { isError?: boolean }).isError);

    return {
      event: {
        type: "mcp",
        serverName: binding.serverName,
        toolName: binding.toolName,
        status: isError ? "error" : "success",
        result: text,
        args: call.args,
        images: parsed.images.length > 0 ? parsed.images : undefined,
      },
      part: {
        functionResponse: {
          name,
          ...(call.id ? { id: call.id } : {}),
          response: isError ? { error: text } : { output: text },
        },
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "tool 실행에 실패했습니다.";
    return {
      event: {
        type: "mcp",
        serverName: binding.serverName,
        toolName: binding.toolName,
        status: "error",
        result: message,
        args: call.args,
      },
      part: {
        functionResponse: {
          name,
          ...(call.id ? { id: call.id } : {}),
          response: { error: message },
        },
      },
    };
  }
}
