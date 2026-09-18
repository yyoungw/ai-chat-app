"use client";

import { MessageSquarePlus, PanelLeft, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatThread } from "@/lib/types/chat";

type ChatSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threads: ChatThread[];
  activeId: string | null;
  onSelect: (threadId: string) => void;
  onNewChat: () => void;
  onDelete: (threadId: string) => void;
};

export function ChatSidebarToggle({
  open,
  onOpenChange,
}: Pick<ChatSidebarProps, "open" | "onOpenChange">) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => onOpenChange(!open)}
      aria-label={open ? "채팅 이력 닫기" : "채팅 이력 열기"}
      aria-expanded={open}
      className="size-8 shrink-0 rounded-xl bg-white/30 hover:bg-white/50"
    >
      <PanelLeft className="size-4 text-slate-700" />
    </Button>
  );
}

export function ChatSidebar({
  open,
  onOpenChange,
  threads,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: ChatSidebarProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="사이드바 닫기"
        className="absolute inset-0 z-20 bg-slate-900/20 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      <aside className="absolute top-0 left-0 z-40 flex h-full w-[min(100%,18rem)] flex-col border-r border-white/50 bg-white/55 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 border-b border-white/40 px-3 py-3">
          <p className="text-sm font-semibold text-slate-800">채팅 이력</p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onNewChat}
              aria-label="새 채팅"
              className="hover:bg-white/50"
            >
              <MessageSquarePlus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="닫기"
              className="hover:bg-white/50"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-1 p-2">
            {threads.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-slate-500">
                저장된 채팅이 없습니다
              </p>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  className={
                    thread.id === activeId
                      ? "group flex items-center gap-1 rounded-xl border border-white/60 bg-white/70 px-1 py-0.5"
                      : "group flex items-center gap-1 rounded-xl border border-transparent px-1 py-0.5 hover:bg-white/40"
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(thread.id);
                      onOpenChange(false);
                    }}
                    className="min-w-0 flex-1 px-2 py-2 text-left"
                  >
                    <span className="line-clamp-2 text-xs font-medium text-slate-800">
                      {thread.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-slate-500">
                      {formatTime(thread.updatedAt)} · {thread.messages.length}
                      개 메시지
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-70 hover:bg-white/60 hover:opacity-100"
                    aria-label={`${thread.title} 삭제`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(thread.id);
                    }}
                  >
                    <Trash2 className="size-3.5 text-slate-500" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}
