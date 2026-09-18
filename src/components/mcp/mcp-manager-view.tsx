"use client";

import { ArrowLeft, ServerCog } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { McpInspector } from "@/components/mcp/mcp-inspector";
import { McpServerFormDialog } from "@/components/mcp/mcp-server-form-dialog";
import { McpServerList } from "@/components/mcp/mcp-server-list";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { hydrateFromRemote, getMcpSecretFlags } from "@/lib/storage/hydrate-remote";
import {
  deleteServer,
  forgetDesiredConnection,
  rememberDesiredConnection,
  saveMcpStore,
  upsertServer,
} from "@/lib/storage/mcp-storage";
import { connectHost, disconnectHost } from "@/lib/mcp/host-client";
import { mcpReconnectBlockedReason } from "@/lib/mcp/reachability";
import { restoreDesiredSessions } from "@/lib/mcp/restore-sessions";
import type {
  McpConnectionStatus,
  McpServerConfig,
  McpServerStore,
  McpSessionSecrets,
} from "@/lib/types/mcp";

type ConnectionState = {
  status: McpConnectionStatus;
  error: string | null;
};

const DISCONNECTED: ConnectionState = { status: "disconnected", error: null };

export function McpManagerView() {
  const [hydrated, setHydrated] = useState(false);
  const [store, setStore] = useState<McpServerStore>({
    version: 1,
    servers: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Record<string, ConnectionState>>(
    {}
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<McpServerConfig | null>(null);
  const [secretFlags, setSecretFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void hydrateFromRemote().then((hydrated) => {
      setStore({ version: 1, servers: hydrated.mcp.servers });
      setSecretFlags(hydrated.mcp.secretFlags);
      setSelectedId(hydrated.mcp.servers[0]?.id ?? null);
      setHydrated(true);

      void restoreDesiredSessions(hydrated.mcp.servers, (statuses) => {
        setConnections(statuses);
      });
    });
  }, []);

  const selected =
    store.servers.find((server) => server.id === selectedId) ?? null;
  const connection = selected
    ? (connections[selected.id] ?? DISCONNECTED)
    : DISCONNECTED;

  const statuses = useMemo(() => {
    const next: Record<string, McpConnectionStatus> = {};
    for (const server of store.servers) {
      next[server.id] = connections[server.id]?.status ?? "disconnected";
    }
    return next;
  }, [store.servers, connections]);

  function persist(next: McpServerStore) {
    setStore(next);
    saveMcpStore(next);
  }

  async function clearConnection(serverId: string) {
    forgetDesiredConnection(serverId);
    try {
      await disconnectHost(serverId);
    } catch {
      // 이미 끊긴 세션
    }
    setConnections((prev) => {
      const copy = { ...prev };
      delete copy[serverId];
      return copy;
    });
  }

  function handleSave(server: McpServerConfig) {
    persist(upsertServer(store, server));
    setSelectedId(server.id);
    void clearConnection(server.id);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    persist(deleteServer(store, id));
    void clearConnection(id);
    setSelectedId((current) => {
      if (current !== id) return current;
      const remaining = store.servers.filter((item) => item.id !== id);
      return remaining[0]?.id ?? null;
    });
    setDeleteTarget(null);
  }

  async function handleConnect(
    secrets?: McpSessionSecrets,
    persistSecrets?: boolean
  ) {
    if (!selected) return;
    const blocked = mcpReconnectBlockedReason(selected);
    if (blocked) {
      setConnections((prev) => ({
        ...prev,
        [selected.id]: { status: "error", error: blocked },
      }));
      return;
    }
    const id = selected.id;
    setConnections((prev) => ({
      ...prev,
      [id]: { status: "connecting", error: null },
    }));
    try {
      await connectHost(selected, secrets, { persistSecrets });
      rememberDesiredConnection(id);
      if (persistSecrets) {
        setSecretFlags((prev) => ({ ...prev, [id]: true }));
      }
      setConnections((prev) => ({
        ...prev,
        [id]: { status: "connected", error: null },
      }));
    } catch (err: unknown) {
      setConnections((prev) => ({
        ...prev,
        [id]: {
          status: "error",
          error: err instanceof Error ? err.message : "연결에 실패했습니다.",
        },
      }));
    }
  }

  function handleDisconnect() {
    if (!selected) return;
    void clearConnection(selected.id);
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

      <header className="relative z-10 mx-auto mt-3 flex w-full max-w-6xl items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/45 px-3 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "bg-white/30 hover:bg-white/50"
            )}
          >
            <ArrowLeft className="size-4" />
            채팅
          </Link>
          <ServerCog className="size-5 shrink-0 text-sky-700" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-slate-800">
              MCP 관리
            </h1>
            <p className="truncate text-xs text-slate-500">
              서버 등록과 인스펙터
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 px-3 py-3 lg:flex-row">
        {!hydrated ? (
          <p className="py-12 text-center text-sm text-slate-500">불러오는 중…</p>
        ) : (
          <>
            <McpServerList
              servers={store.servers}
              selectedId={selectedId}
              statuses={statuses}
              onSelect={setSelectedId}
              onAdd={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              onEdit={(server) => {
                setEditing(server);
                setFormOpen(true);
              }}
              onDelete={setDeleteTarget}
            />
            <McpInspector
              server={selected}
              status={connection.status}
              errorMessage={connection.error}
              connecting={connection.status === "connecting"}
              hasStoredSecrets={Boolean(
                selected && (secretFlags[selected.id] ?? getMcpSecretFlags()[selected.id])
              )}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </>
        )}
      </div>

      <McpServerFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        servers={store.servers}
        initial={editing}
        onSave={handleSave}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>서버를 삭제할까요?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" 등록 정보가 삭제됩니다.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              취소
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
