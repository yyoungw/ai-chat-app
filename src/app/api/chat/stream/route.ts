import {
  createAppError,
  mapProviderError,
  type AppError,
} from "@/lib/errors";
import { getGeminiModel } from "@/lib/gemini/client";
import { streamChat } from "@/lib/gemini/stream-chat";
import type { ChatMessageInput } from "@/lib/types/chat";
import type { EnabledMcpTool, McpStreamEvent } from "@/lib/mcp/gemini-tools";

export const runtime = "nodejs";

type StreamRequestBody = {
  messages?: ChatMessageInput[];
  enabledTools?: unknown;
};

type SseEvent =
  | { type: "token"; text: string }
  | McpStreamEvent
  | { type: "done" }
  | { type: "error"; code: string; message: string };

function encodeSse(event: SseEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    "status" in error
  );
}

function jsonError(error: AppError): Response {
  return Response.json(
    { code: error.code, message: error.message },
    { status: error.status >= 400 && error.status < 600 ? error.status : 500 }
  );
}

function parseEnabledTools(value: unknown): EnabledMcpTool[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  const tools: EnabledMcpTool[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { serverId?: unknown; toolName?: unknown };
    if (typeof row.serverId !== "string" || row.serverId.length === 0) continue;
    if (typeof row.toolName !== "string" || row.toolName.length === 0) continue;
    tools.push({ serverId: row.serverId, toolName: row.toolName });
  }
  return tools;
}

export async function POST(request: Request) {
  let body: StreamRequestBody;

  try {
    body = (await request.json()) as StreamRequestBody;
  } catch {
    return jsonError(createAppError("BAD_REQUEST", 400, "JSON 본문이 필요합니다."));
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(
      createAppError("BAD_REQUEST", 400, "messages 배열이 필요합니다.")
    );
  }

  for (const message of messages) {
    if (
      !message ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string"
    ) {
      return jsonError(
        createAppError("BAD_REQUEST", 400, "메시지 형식이 올바르지 않습니다.")
      );
    }
  }

  // 환경 변수 사전 검증 (스트리밍 시작 전)
  try {
    getGeminiModel();
    if (!process.env.GEMINI_API_KEY?.trim()) {
      return jsonError(
        createAppError("UNAUTHORIZED", 401, "GEMINI_API_KEY가 설정되지 않았습니다.")
      );
    }
  } catch (error) {
    if (isAppError(error)) return jsonError(error);
    return jsonError(mapProviderError(error));
  }

  const signal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of streamChat({
          messages,
          enabledTools: parseEnabledTools(body.enabledTools),
          signal,
        })) {
          if (signal.aborted) break;
          controller.enqueue(encodeSse(event));
        }

        if (!signal.aborted) {
          controller.enqueue(encodeSse({ type: "done" }));
        }
        controller.close();
      } catch (error) {
        if (signal.aborted) {
          controller.close();
          return;
        }

        const appError = isAppError(error) ? error : mapProviderError(error);
        try {
          controller.enqueue(
            encodeSse({
              type: "error",
              code: appError.code,
              message: appError.message,
            })
          );
        } catch {
          // 이미 닫힌 컨트롤러
        }
        controller.close();
      }
    },
    cancel() {
      // 클라이언트 disconnect
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
