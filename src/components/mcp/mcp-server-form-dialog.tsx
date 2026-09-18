"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  draftToServerConfig,
  formatArgsLine,
  validateMcpServerDraft,
} from "@/lib/storage/mcp-storage";
import type {
  McpServerConfig,
  McpServerDraft,
  McpTransport,
} from "@/lib/types/mcp";

type McpServerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servers: McpServerConfig[];
  initial?: McpServerConfig | null;
  onSave: (server: McpServerConfig) => void;
};

const EMPTY_DRAFT: McpServerDraft = {
  name: "",
  transport: "stdio",
  command: "npx",
  argsLine: "-y @modelcontextprotocol/server-filesystem ./",
  url: "http://localhost:3000/api/mcp",
};

function draftFromServer(server: McpServerConfig): McpServerDraft {
  return {
    name: server.name,
    transport: server.transport,
    command: server.command ?? "npx",
    argsLine: formatArgsLine(server.args),
    url: server.url ?? "http://localhost:3000/api/mcp",
  };
}

export function McpServerFormDialog({
  open,
  onOpenChange,
  servers,
  initial,
  onSave,
}: McpServerFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        {open ? (
          <McpServerForm
            key={initial?.id ?? "new"}
            servers={servers}
            initial={initial}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function McpServerForm({
  servers,
  initial,
  onSave,
  onClose,
}: {
  servers: McpServerConfig[];
  initial?: McpServerConfig | null;
  onSave: (server: McpServerConfig) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<McpServerDraft>(
    initial ? draftFromServer(initial) : EMPTY_DRAFT
  );
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  function update<K extends keyof McpServerDraft>(
    key: K,
    value: McpServerDraft[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateMcpServerDraft(draft, servers, initial?.id);
    if (message) {
      setError(message);
      return;
    }
    onSave(draftToServerConfig(draft, initial ?? undefined));
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{isEdit ? "MCP 서버 수정" : "MCP 서버 등록"}</DialogTitle>
        <DialogDescription>
          연결 메타는 데이터베이스에 저장합니다. env와 Authorization 헤더는 기본으로 저장하지 않습니다.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="mcp-name">이름</Label>
        <Input
          id="mcp-name"
          value={draft.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="filesystem"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-2">
        <Label>Transport</Label>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <TransportToggle
            value="stdio"
            current={draft.transport}
            onChange={(value) => update("transport", value)}
          >
            stdio
          </TransportToggle>
          <TransportToggle
            value="streamable-http"
            current={draft.transport}
            onChange={(value) => update("transport", value)}
          >
            Streamable HTTP
          </TransportToggle>
        </div>
      </div>

      {draft.transport === "stdio" ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="mcp-command">command</Label>
            <Input
              id="mcp-command"
              value={draft.command}
              onChange={(event) => update("command", event.target.value)}
              placeholder="npx"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mcp-args">args</Label>
            <Input
              id="mcp-args"
              value={draft.argsLine}
              onChange={(event) => update("argsLine", event.target.value)}
              placeholder="-y @scope/package"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              공백으로 구분합니다. 세션 env는 연결 화면에서 따로 입력합니다.
            </p>
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="mcp-url">URL</Label>
          <Input
            id="mcp-url"
            value={draft.url}
            onChange={(event) => update("url", event.target.value)}
            placeholder="http://localhost:3000/api/mcp"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Streamable HTTP 엔드포인트입니다. 헤더는 연결 시에만 입력합니다.
          </p>
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit">{isEdit ? "저장" : "등록"}</Button>
      </DialogFooter>
    </form>
  );
}

function TransportToggle({
  value,
  current,
  onChange,
  children,
}: {
  value: McpTransport;
  current: McpTransport;
  onChange: (value: McpTransport) => void;
  children: ReactNode;
}) {
  const active = value === current;
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "ghost"}
      className="flex-1"
      aria-pressed={active}
      onClick={() => onChange(value)}
    >
      {children}
    </Button>
  );
}
