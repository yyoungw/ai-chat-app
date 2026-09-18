import { createAppError } from "@/lib/errors";
import {
  asRecord,
  asStringRecord,
  isAppError,
  jsonError,
  readJsonBody,
} from "@/lib/mcp/http";
import {
  callTool,
  connectHost,
  disconnectHost,
  getPrompt,
  listPrompts,
  listResources,
  listTools,
  readResource,
} from "@/lib/mcp/host";
import { logMcp, secretKeys } from "@/lib/mcp/log";
import {
  loadMcpSecrets,
  saveMcpSecrets,
} from "@/lib/supabase/mcp-repo";
import { ensureWorkspaceId } from "@/lib/supabase/workspace";
import type { McpServerConfig, McpTransport } from "@/lib/types/mcp";

export const runtime = "nodejs";

function parseServer(body: Record<string, unknown>): McpServerConfig {
  const transport = body.transport;
  if (transport !== "stdio" && transport !== "streamable-http") {
    throw createAppError("BAD_REQUEST", 400, "transport가 올바르지 않습니다.");
  }
  if (typeof body.id !== "string" || typeof body.name !== "string") {
    throw createAppError("BAD_REQUEST", 400, "서버 id/name이 필요합니다.");
  }

  const typedTransport: McpTransport = transport;
  return {
    id: body.id,
    name: body.name,
    transport: typedTransport,
    command: typeof body.command === "string" ? body.command : undefined,
    args: Array.isArray(body.args)
      ? body.args.filter((item): item is string => typeof item === "string")
      : undefined,
    url: typeof body.url === "string" ? body.url : undefined,
    createdAt: typeof body.createdAt === "number" ? body.createdAt : Date.now(),
    updatedAt: typeof body.updatedAt === "number" ? body.updatedAt : Date.now(),
  };
}

async function handle(path: string[], request: Request): Promise<Response> {
  const action = path.join("/");
  const raw = await readJsonBody(request);
  const body = asRecord(raw);
  if (!body) {
    throw createAppError("BAD_REQUEST", 400, "요청 본문이 올바르지 않습니다.");
  }

  if (action === "connect") {
    const server = parseServer(body);
    const requestSecrets = {
      headers: asStringRecord(body.headers),
      env: asStringRecord(body.env),
    };

    let stored: { headers?: Record<string, string>; env?: Record<string, string> } | undefined;
    try {
      const workspaceId = await ensureWorkspaceId();
      stored = await loadMcpSecrets(workspaceId, server.id);
      if (
        body.persistSecrets === true &&
        (requestSecrets.headers || requestSecrets.env)
      ) {
        await saveMcpSecrets(workspaceId, server.id, requestSecrets);
      }
    } catch {
      stored = undefined;
    }

    const secrets = {
      headers: requestSecrets.headers ?? stored?.headers,
      env: requestSecrets.env ?? stored?.env,
    };

    logMcp("connect-secrets", {
      serverId: server.id,
      persistSecrets: body.persistSecrets === true,
      headerKeys: secretKeys(secrets.headers),
      envKeys: secretKeys(secrets.env),
      fromStore: Boolean(stored),
    });

    const catalog = await connectHost(server, secrets);
    return Response.json({ catalog });
  }

  const serverId = typeof body.serverId === "string" ? body.serverId : "";
  if (!serverId) {
    throw createAppError("BAD_REQUEST", 400, "serverId가 필요합니다.");
  }

  if (action === "disconnect") {
    await disconnectHost(serverId);
    return Response.json({ ok: true });
  }

  if (action === "tools/list") {
    return Response.json({ tools: await listTools(serverId) });
  }
  if (action === "tools/call") {
    if (typeof body.name !== "string") {
      throw createAppError("BAD_REQUEST", 400, "tool name이 필요합니다.");
    }
    const result = await callTool(serverId, body.name, body.args);
    return Response.json({ result });
  }
  if (action === "prompts/list") {
    return Response.json({ prompts: await listPrompts(serverId) });
  }
  if (action === "prompts/get") {
    if (typeof body.name !== "string") {
      throw createAppError("BAD_REQUEST", 400, "prompt name이 필요합니다.");
    }
    const result = await getPrompt(serverId, body.name, body.args);
    return Response.json({ result });
  }
  if (action === "resources/list") {
    return Response.json({ resources: await listResources(serverId) });
  }
  if (action === "resources/read") {
    if (typeof body.uri !== "string") {
      throw createAppError("BAD_REQUEST", 400, "resource uri가 필요합니다.");
    }
    const result = await readResource(serverId, body.uri);
    return Response.json({ result });
  }

  throw createAppError("BAD_REQUEST", 400, "알 수 없는 MCP host 경로입니다.");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    return await handle(path ?? [], request);
  } catch (error) {
    if (isAppError(error)) return jsonError(error);
    return jsonError(
      createAppError("SERVER_ERROR", 500, "MCP host 요청에 실패했습니다.")
    );
  }
}
