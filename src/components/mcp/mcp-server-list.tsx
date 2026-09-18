"use client";

import { Plus, Server } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  McpConnectionStatus,
  McpServerConfig,
} from "@/lib/types/mcp";

const TRANSPORT_LABEL: Record<McpServerConfig["transport"], string> = {
  stdio: "stdio",
  "streamable-http": "HTTP",
};

function statusBadge(status: McpConnectionStatus | undefined) {
  switch (status) {
    case "connected":
      return { label: "연결됨", variant: "default" as const };
    case "connecting":
      return { label: "연결 중", variant: "secondary" as const };
    case "error":
      return { label: "오류", variant: "destructive" as const };
    default:
      return { label: "미연결", variant: "outline" as const };
  }
}

type McpServerListProps = {
  servers: McpServerConfig[];
  selectedId: string | null;
  statuses: Record<string, McpConnectionStatus>;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (server: McpServerConfig) => void;
  onDelete: (server: McpServerConfig) => void;
};

export function McpServerList({
  servers,
  selectedId,
  statuses,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: McpServerListProps) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-white/50 bg-white/45 shadow-sm backdrop-blur-xl lg:w-72 lg:shrink-0">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">서버 목록</p>
          <p className="text-xs text-slate-500">{servers.length}개 등록</p>
        </div>
        <Button type="button" size="sm" onClick={onAdd} aria-label="서버 추가">
          <Plus className="size-4" />
          추가
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <Server className="size-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">
              등록된 서버가 없습니다
            </p>
            <p className="text-xs text-slate-500">
              stdio 또는 Streamable HTTP 서버를 추가하세요.
            </p>
            <Button type="button" size="sm" onClick={onAdd}>
              <Plus className="size-4" />
              추가
            </Button>
          </div>
        ) : (
          <ul role="listbox" aria-label="MCP 서버 목록" className="flex flex-col gap-1 px-2 pb-3">
            {servers.map((server) => {
              const selected = server.id === selectedId;
              const connecting = statuses[server.id] === "connecting";
              const badge = statusBadge(statuses[server.id]);
              return (
                <li key={server.id} role="none">
                  <div
                    className={
                      selected
                        ? "rounded-xl border border-sky-200/80 bg-white/80 p-2.5 shadow-sm"
                        : "rounded-xl border border-transparent p-2.5 hover:bg-white/50"
                    }
                  >
                    <button
                      type="button"
                      role="option"
                      onClick={() => onSelect(server.id)}
                      aria-selected={selected}
                      aria-current={selected ? "true" : undefined}
                      className="flex w-full flex-col items-start gap-1 text-left"
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-800">
                          {server.name}
                        </span>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </span>
                      <span className="truncate text-xs text-slate-500">
                        {TRANSPORT_LABEL[server.transport]}
                        {server.transport === "stdio"
                          ? ` · ${server.command ?? ""}`
                          : ` · ${server.url ?? ""}`}
                      </span>
                    </button>
                    <div className="mt-2 flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => onEdit(server)}
                        disabled={connecting}
                      >
                        수정
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-destructive"
                        onClick={() => onDelete(server)}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </aside>
  );
}
