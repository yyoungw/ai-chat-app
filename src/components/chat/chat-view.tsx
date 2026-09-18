"use client";

import { MessageSquare, RotateCcw, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatSidebar, ChatSidebarToggle } from "@/components/chat/chat-sidebar";
import { McpToolsToggle } from "@/components/chat/mcp-tools-toggle";
import { useMcpChatSession } from "@/components/chat/use-mcp-chat-session";
import { McpConnectionBadge } from "@/components/mcp/mcp-connection-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createAppError,
  mapHttpStatusToError,
  type AppError,
  type AppErrorCode,
} from "@/lib/errors";
import { cn } from "@/lib/utils";
import { upsertMcpResult } from "@/lib/chat/mcp-results";
import { hydrateFromRemote } from "@/lib/storage/hydrate-remote";
import { loadEnabledChatTools } from "@/lib/storage/mcp-storage";
import {
  createEmptyThread,
  createMessageId,
  deleteThread,
  saveChatStore,
  upsertActiveThread,
} from "@/lib/storage/chat-storage";
import type {
  ChatMessage as ChatMessageType,
  ChatStore,
  McpToolResult,
} from "@/lib/types/chat";

type SseEvent =
  | { type: "token"; text: string }
  | (McpToolResult & { type: "mcp" })
  | { type: "done" }
  | { type: "error"; code: string; message: string };

const MODEL_LABEL =
  process.env.NEXT_PUBLIC_GEMINI_MODEL_LABEL ?? "gemini-3.5-flash-lite";

function isAppErrorCode(value: string): value is AppErrorCode {
  return (
    value === "UNAUTHORIZED" ||
    value === "FORBIDDEN" ||
    value === "BAD_REQUEST" ||
    value === "RATE_LIMITED" ||
    value === "SERVER_ERROR" ||
    value === "NETWORK_ERROR" ||
    value === "ABORTED"
  );
}

export function ChatView() {
  const [store, setStore] = useState<ChatStore>({
    version: 2,
    activeId: null,
    threads: [],
  });
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastFailedUserText, setLastFailedUserText] = useState<string | null>(
    null
  );
  const [streamingAssistantId, setStreamingAssistantId] = useState<
    string | null
  >(null);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const persistSkipRef = useRef(true);
  const mcp = useMcpChatSession();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void hydrateFromRemote().then((hydrated) => {
        const loaded = hydrated.chat;
        setStore(loaded);
        const active = loaded.threads.find((t) => t.id === loaded.activeId);
        setMessages(active?.messages ?? []);
        setHasLoaded(true);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const hydrated = hasLoaded;

  useEffect(() => {
    if (!hydrated) return;
    if (persistSkipRef.current) {
      persistSkipRef.current = false;
      return;
    }
    const next = upsertActiveThread(store, messages, store.activeId);
    setStore(next);
    saveChatStore(next);
    // store는 의도적으로 deps에서 제외 — messages 변경 시 활성 스레드만 갱신
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeId는 ref로 동기화
  }, [messages, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function stopStreaming() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamingAssistantId(null);
  }

  function switchToThread(threadId: string) {
    stopStreaming();
    const thread = store.threads.find((t) => t.id === threadId);
    if (!thread) return;
    persistSkipRef.current = true;
    setStore((prev) => {
      const next = { ...prev, activeId: threadId };
      saveChatStore(next);
      return next;
    });
    setMessages(thread.messages);
    setError(null);
    setLastFailedUserText(null);
  }

  function handleNewChat() {
    stopStreaming();
    const current = store.threads.find((t) => t.id === store.activeId);
    if (current && current.messages.length === 0) {
      setSidebarOpen(false);
      return;
    }

    const thread = createEmptyThread();
    const next: ChatStore = {
      version: 2,
      activeId: thread.id,
      threads: [thread, ...store.threads],
    };
    persistSkipRef.current = true;
    setStore(next);
    saveChatStore(next);
    setMessages([]);
    setError(null);
    setLastFailedUserText(null);
    setSidebarOpen(false);
  }

  function handleDeleteThread(threadId: string) {
    if (isStreaming && store.activeId === threadId) stopStreaming();
    const next = deleteThread(store, threadId);
    persistSkipRef.current = true;
    setStore(next);
    saveChatStore(next);
    if (store.activeId === threadId) {
      const active = next.threads.find((t) => t.id === next.activeId);
      setMessages(active?.messages ?? []);
      setError(null);
      setLastFailedUserText(null);
    }
  }

  async function streamReply(history: ChatMessageType[]) {
    const assistantId = createMessageId();
    setStreamingAssistantId(assistantId);

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      },
    ]);
    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          enabledTools: loadEnabledChatTools(
            mcp.tools.map((tool) => ({
              serverId: tool.serverId,
              toolName: tool.name,
            }))
          ),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let appError = mapHttpStatusToError(response.status);
        try {
          const payload = (await response.json()) as {
            code?: string;
            message?: string;
          };
          if (payload.message) {
            appError = {
              ...appError,
              message: payload.message,
              code:
                payload.code && isAppErrorCode(payload.code)
                  ? payload.code
                  : appError.code,
            };
          }
        } catch {
          // ignore
        }
        throw appError;
      }

      if (!response.body) {
        throw createAppError("SERVER_ERROR", 500, "응답 스트림이 없습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.startsWith("data:"));
          if (!line) continue;

          const raw = line.slice(5).trim();
          if (!raw) continue;

          let event: SseEvent;
          try {
            event = JSON.parse(raw) as SseEvent;
          } catch {
            continue;
          }

          if (event.type === "token") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.text }
                  : m
              )
            );
          } else if (event.type === "mcp") {
            const mcpEvent: McpToolResult = {
              serverName: event.serverName,
              toolName: event.toolName,
              status: event.status,
              result: event.result,
              args: event.args,
              images: event.images,
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, mcpResults: upsertMcpResult(m.mcpResults, mcpEvent) }
                  : m
              )
            );
          } else if (event.type === "error") {
            throw {
              code: isAppErrorCode(event.code) ? event.code : "SERVER_ERROR",
              message: event.message,
              status: 500,
            } satisfies AppError;
          }
        }
      }

      setLastFailedUserText(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(createAppError("ABORTED"));
        return;
      }

      const appError =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        "code" in err
          ? (err as AppError)
          : createAppError("NETWORK_ERROR");

      setError(appError);
      setMessages((prev) =>
        prev.filter(
          (m) =>
            !(
              m.id === assistantId &&
              m.content.trim().length === 0 &&
              !m.mcpResults?.length
            )
        )
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsStreaming(false);
      setStreamingAssistantId(null);
    }
  }

  async function handleSend(text: string) {
    const userMessage: ChatMessageType = {
      id: createMessageId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const next = [...messages, userMessage];
    setMessages(next);
    setLastFailedUserText(text);
    await streamReply(next);
  }

  async function handleRetry() {
    if (!lastFailedUserText || isStreaming) return;
    const last = messages[messages.length - 1];
    if (last?.role === "user" && last.content === lastFailedUserText) {
      await streamReply(messages);
      return;
    }
    await handleSend(lastFailedUserText);
  }

  function handleClear() {
    stopStreaming();
    persistSkipRef.current = true;
    setMessages([]);
    setError(null);
    setLastFailedUserText(null);
    if (store.activeId) {
      const next = upsertActiveThread(store, [], store.activeId);
      setStore(next);
      saveChatStore(next);
    }
  }

  return (
    <div className="chat-atmosphere relative flex h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-sky-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-10 size-80 rounded-full bg-teal-100/50 blur-3xl"
      />

      <ChatSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        threads={store.threads}
        activeId={store.activeId}
        onSelect={switchToThread}
        onNewChat={handleNewChat}
        onDelete={handleDeleteThread}
      />

      <header className="relative z-10 mx-auto mt-3 flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/45 px-3 py-3 shadow-sm backdrop-blur-xl sm:ml-auto">
        <div className="flex min-w-0 items-center gap-2">
          <ChatSidebarToggle
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />
          <MessageSquare className="size-5 shrink-0 text-sky-700" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-slate-800">
              AI Chat
            </h1>
            <p className="truncate text-xs text-slate-500">{MODEL_LABEL}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <McpConnectionBadge count={mcp.ready ? mcp.connectedCount : null} />
          <Link
            href="/mcp"
            aria-label="MCP 서버 관리"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "bg-white/30 hover:bg-white/50"
            )}
          >
            <Settings className="size-4" />
            설정
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={messages.length === 0 && !error}
            aria-label="대화 초기화"
            className="bg-white/30 hover:bg-white/50"
          >
            <Trash2 className="size-4" />
            초기화
          </Button>
        </div>
      </header>

      <ScrollArea className="relative z-10 min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
          {!hydrated ? (
            <p className="py-12 text-center text-sm text-slate-500">
              불러오는 중…
            </p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/45 bg-white/35 px-6 py-16 text-center shadow-sm backdrop-blur-xl">
              <MessageSquare className="size-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-800">
                대화를 시작해 보세요
              </p>
              <p className="max-w-xs text-xs text-slate-500">
                모든 채팅 이력은 이 브라우저의 localStorage에 저장됩니다.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                mcpResults={message.mcpResults}
                isStreaming={
                  isStreaming && message.id === streamingAssistantId
                }
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {error ? (
        <div
          className="relative z-10 mx-auto flex w-full max-w-2xl items-start justify-between gap-3 px-4 pb-2"
          role="alert"
        >
          <p className="rounded-xl border border-red-200/60 bg-white/60 px-3 py-2 text-sm text-destructive backdrop-blur-md">
            {error.message}
          </p>
          {error.code !== "ABORTED" && lastFailedUserText ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isStreaming}
              className="border-white/50 bg-white/50 backdrop-blur-md"
            >
              <RotateCcw className="size-3.5" />
              재시도
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-4">
        <ChatComposer
          isStreaming={isStreaming}
          onSend={handleSend}
          onStop={stopStreaming}
          disabled={!hydrated || !mcp.ready}
          toolbar={
            mcp.ready && mcp.connected.length > 0 ? (
              <McpToolsToggle tools={mcp.tools} />
            ) : null
          }
        />
      </div>
    </div>
  );
}
