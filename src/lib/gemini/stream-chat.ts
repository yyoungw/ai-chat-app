import "server-only";

import type { Content, FunctionCall, Part } from "@google/genai";

import { createAppError, mapProviderError, type AppError } from "@/lib/errors";
import { getGeminiClient, getGeminiModel } from "@/lib/gemini/client";
import { CHAT_SYSTEM_INSTRUCTION } from "@/lib/gemini/system-prompt";
import {
  executeGeminiFunctionCall,
  loadGeminiMcpTools,
  MAX_MCP_TOOL_LOOPS,
  type EnabledMcpTool,
  type GeminiMcpBinding,
  type McpStreamEvent,
} from "@/lib/mcp/gemini-tools";
import type { ChatMessageInput } from "@/lib/types/chat";

export type StreamChatParams = {
  messages: ChatMessageInput[];
  enabledTools?: EnabledMcpTool[];
  signal?: AbortSignal;
};

export type StreamChatEvent =
  | { type: "token"; text: string }
  | McpStreamEvent;

/** 앱 메시지를 Gemini contents 형식으로 변환 */
export function toGeminiContents(messages: ChatMessageInput[]): Content[] {
  return messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function collectFunctionCalls(
  existing: FunctionCall[],
  incoming: FunctionCall[] | undefined
): FunctionCall[] {
  if (!incoming?.length) return existing;
  const next = [...existing];
  for (const call of incoming) {
    if (!call.name) continue;
    const index = next.findIndex((item) =>
      item.id && call.id ? item.id === call.id : item.name === call.name
    );
    if (index >= 0) next[index] = call;
    else next.push(call);
  }
  return next;
}

/** 스트리밍 파트를 합치되 thoughtSignature를 보존한다. */
function mergeModelParts(existing: Part[], incoming: Part[]): Part[] {
  const next = [...existing];
  for (const part of incoming) {
    if (part.functionCall?.name) {
      const index = next.findIndex((item) => {
        const left = item.functionCall;
        const right = part.functionCall;
        if (!left || !right) return false;
        return left.id && right.id ? left.id === right.id : left.name === right.name;
      });
      if (index >= 0) {
        next[index] = { ...next[index], ...part };
      } else {
        next.push(part);
      }
      continue;
    }

    if (part.thought) {
      next.push(part);
      continue;
    }

    const last = next[next.length - 1];
    if (part.text && last && last.text !== undefined && !last.functionCall && !last.thought) {
      last.text = `${last.text}${part.text}`;
      if (part.thoughtSignature) last.thoughtSignature = part.thoughtSignature;
      continue;
    }

    next.push(part);
  }
  return next;
}

/**
 * Gemini 스트리밍. 연결 중인 MCP tools가 있으면 function call을 서버에서 실행한다.
 * 시간복잡도: O(n + t) — n은 청크 수, t는 tool 루프(최대 5).
 */
export async function* streamChat({
  messages,
  enabledTools,
  signal,
}: StreamChatParams): AsyncGenerator<StreamChatEvent, void, unknown> {
  if (!messages.length || !messages.some((m) => m.role === "user")) {
    throw createAppError("BAD_REQUEST", 400, "전송할 사용자 메시지가 없습니다.");
  }

  const contents = toGeminiContents(messages);
  if (!contents.length) {
    throw createAppError("BAD_REQUEST", 400, "메시지 내용이 비어 있습니다.");
  }

  try {
    const ai = getGeminiClient();
    const model = getGeminiModel();
    const { declarations, bindings } =
      enabledTools && enabledTools.length === 0
        ? { declarations: [], bindings: new Map<string, GeminiMcpBinding>() }
        : await loadGeminiMcpTools(enabledTools);

    let loops = 0;
    while (true) {
      let functionCalls: FunctionCall[] = [];
      let modelParts: Part[] = [];

      const response = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: CHAT_SYSTEM_INSTRUCTION,
          ...(signal ? { abortSignal: signal } : {}),
          ...(declarations.length > 0
            ? {
                tools: [{ functionDeclarations: declarations }],
                automaticFunctionCalling: { disable: true },
              }
            : {}),
        },
      });

      for await (const chunk of response) {
        if (signal?.aborted) {
          throw createAppError("ABORTED");
        }
        const text = chunk.text;
        if (text) {
          yield { type: "token", text };
        }
        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        modelParts = mergeModelParts(modelParts, parts);
        functionCalls = collectFunctionCalls(functionCalls, chunk.functionCalls);
        functionCalls = collectFunctionCalls(
          functionCalls,
          parts
            .map((part) => part.functionCall)
            .filter((call): call is FunctionCall => Boolean(call?.name))
        );
      }

      if (functionCalls.length === 0) return;

      loops += 1;
      if (loops > MAX_MCP_TOOL_LOOPS) {
        yield {
          type: "token",
          text: "\n도구 호출 한도에 도달해 더 이상 실행하지 않습니다.",
        };
        return;
      }

      contents.push({
        role: "model",
        parts:
          modelParts.length > 0
            ? modelParts
            : functionCalls.map((call) => ({ functionCall: call })),
      });

      const responseParts: Part[] = [];
      for (const call of functionCalls) {
        const binding = bindings.get(call.name ?? "");
        yield {
          type: "mcp",
          serverName: binding?.serverName ?? "MCP",
          toolName: binding?.toolName ?? call.name ?? "tool",
          status: "running",
          args: call.args,
        };
        const executed = await executeGeminiFunctionCall(call, bindings);
        yield executed.event;
        responseParts.push(executed.part);
      }
      contents.push({ role: "user", parts: responseParts });
    }
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    throw mapProviderError(error);
  }
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
