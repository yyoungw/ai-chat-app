import type { ChatStore } from "@/lib/types/chat";
import type { McpPersistSnapshot } from "@/lib/types/mcp";
import {
  loadDesiredConnections,
  loadDisabledChatTools,
  loadMcpStore,
} from "@/lib/storage/mcp-storage";

type PutOptions = {
  keepalive?: boolean;
};

async function putJson(path: string, body: unknown, options?: PutOptions): Promise<void> {
  try {
    await fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: options?.keepalive,
    });
  } catch {
    // 백그라운드 동기화 실패는 UI를 막지 않는다.
  }
}

let chatTimer: number | null = null;
let pendingChat: ChatStore | null = null;
let mcpTimer: number | null = null;
let mcpDirty = false;

const DEBOUNCE_MS = 450;

export function scheduleChatRemoteSave(store: ChatStore): void {
  pendingChat = store;
  if (chatTimer !== null) window.clearTimeout(chatTimer);
  chatTimer = window.setTimeout(() => {
    chatTimer = null;
    const payload = pendingChat;
    pendingChat = null;
    if (payload) void putJson("/api/storage/chat", payload);
  }, DEBOUNCE_MS);
}

export function scheduleMcpRemoteSave(): void {
  mcpDirty = true;
  if (mcpTimer !== null) window.clearTimeout(mcpTimer);
  mcpTimer = window.setTimeout(() => {
    mcpTimer = null;
    if (!mcpDirty) return;
    mcpDirty = false;
    void putJson("/api/storage/mcp", currentMcpPutBody());
  }, DEBOUNCE_MS);
}

function currentMcpPutBody(): Pick<
  McpPersistSnapshot,
  "servers" | "desiredConnections" | "disabledChatTools"
> {
  return {
    servers: loadMcpStore().servers,
    desiredConnections: loadDesiredConnections(),
    disabledChatTools: loadDisabledChatTools(),
  };
}

export function flushRemoteSaves(): void {
  if (chatTimer) {
    window.clearTimeout(chatTimer);
    chatTimer = null;
  }
  if (mcpTimer) {
    window.clearTimeout(mcpTimer);
    mcpTimer = null;
  }

  if (pendingChat) {
    const payload = pendingChat;
    pendingChat = null;
    void putJson("/api/storage/chat", payload, { keepalive: true });
  }
  if (mcpDirty) {
    mcpDirty = false;
    void putJson("/api/storage/mcp", currentMcpPutBody(), { keepalive: true });
  }
}
