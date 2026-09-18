"use client";

import { Bot } from "lucide-react";

import { MarkdownBody } from "@/components/chat/markdown-body";
import { McpResultCard } from "@/components/mcp/mcp-result-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { detectEmotion } from "@/lib/chat/detect-emotion";
import { stabilizeStreamingMarkdown } from "@/lib/chat/stabilize-streaming-markdown";
import { cn } from "@/lib/utils";
import type { ChatRole, McpToolResult } from "@/lib/types/chat";

type ChatMessageProps = {
  role: ChatRole;
  content: string;
  isStreaming?: boolean;
  mcpResults?: McpToolResult[];
};

export function ChatMessage({
  role,
  content,
  isStreaming,
  mcpResults,
}: ChatMessageProps) {
  const isUser = role === "user";
  const showCursor = Boolean(isStreaming && !isUser);
  const emotion = !isUser ? detectEmotion(content) : null;
  const displayContent =
    !isUser && isStreaming ? stabilizeStreamingMarkdown(content) : content;

  if (isUser) {
    return (
      <div className="flex w-full justify-end" data-role={role}>
        <div className="max-w-[85%] rounded-2xl border border-primary/20 bg-primary/90 px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-primary-foreground shadow-sm backdrop-blur-md">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-2.5" data-role={role}>
      <Avatar size="sm" className="mt-0.5 border border-white/50 bg-white/50 shadow-sm backdrop-blur-md">
        <AvatarFallback className="bg-sky-100/80 text-sky-800">
          <Bot className="size-3.5" aria-hidden />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 max-w-[85%] flex-1">
        <div className="mb-1 flex items-center gap-1.5 px-0.5">
          <span className="text-[11px] font-medium text-slate-600">Assistant</span>
          {emotion ? (
            <span
              className="inline-flex size-5 items-center justify-center rounded-full bg-white/50 text-sm leading-none shadow-sm backdrop-blur-sm"
              title={emotion.label}
              aria-label={`감정: ${emotion.label}`}
            >
              {emotion.emoji}
            </span>
          ) : null}
        </div>

        {content.length > 0 || (showCursor && !mcpResults?.length) ? (
          <div
            className={cn(
              "rounded-2xl border border-white/50 bg-white/55 px-3.5 py-2.5 shadow-sm backdrop-blur-xl",
              "text-foreground"
            )}
          >
            {content.length === 0 && showCursor ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
              </span>
            ) : (
              <>
                <MarkdownBody content={displayContent} />
                {showCursor ? (
                  <span
                    className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground/70 align-middle"
                    aria-hidden
                  />
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {mcpResults?.map((item, index) => (
          <McpResultCard
            key={`${item.serverName}-${item.toolName}-${index}`}
            result={item}
          />
        ))}
      </div>
    </div>
  );
}
