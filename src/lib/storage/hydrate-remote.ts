import {
  loadChatStore,
  saveChatStoreLocal,
  setChatPersistListener,
} from "@/lib/storage/chat-storage";
import {
  loadDesiredConnections,
  loadDisabledChatTools,
  loadMcpStore,
  saveDesiredConnectionsLocal,
  saveDisabledChatToolsLocal,
  saveMcpStoreLocal,
  setMcpPersistListener,
} from "@/lib/storage/mcp-storage";
import {
  flushRemoteSaves,
  scheduleChatRemoteSave,
  scheduleMcpRemoteSave,
} from "@/lib/storage/remote-sync";
import type { ChatStore } from "@/lib/types/chat";
import type { McpPersistSnapshot } from "@/lib/types/mcp";

export type HydratedStores = {
  chat: ChatStore;
  mcp: McpPersistSnapshot;
};

let inFlight: Promise<HydratedStores> | null = null;
let secretFlags: Record<string, boolean> = {};
let listenersBound = false;

export function getMcpSecretFlags(): Record<string, boolean> {
  return secretFlags;
}

function readLocalSnapshot(): {
  chat: ChatStore;
  mcp: Omit<McpPersistSnapshot, "secretFlags"> & { secretFlags?: Record<string, boolean> };
} {
  const mcpStore = loadMcpStore();
  return {
    chat: loadChatStore(),
    mcp: {
      version: 1,
      servers: mcpStore.servers,
      desiredConnections: loadDesiredConnections(),
      disabledChatTools: loadDisabledChatTools(),
      secretFlags: {},
    },
  };
}

function applyRemoteSnapshot(result: HydratedStores): void {
  saveChatStoreLocal(result.chat);
  saveMcpStoreLocal({ version: 1, servers: result.mcp.servers });
  saveDesiredConnectionsLocal(result.mcp.desiredConnections);
  saveDisabledChatToolsLocal(result.mcp.disabledChatTools);
  secretFlags = result.mcp.secretFlags;
}

function bindPersistListeners(): void {
  if (listenersBound) return;
  listenersBound = true;
  setChatPersistListener(scheduleChatRemoteSave);
  setMcpPersistListener(scheduleMcpRemoteSave);
  window.addEventListener("pagehide", flushRemoteSaves);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushRemoteSaves();
  });
}

async function migrateLocal(local: ReturnType<typeof readLocalSnapshot>): Promise<HydratedStores> {
  const response = await fetch("/api/storage/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(local),
  });
  if (!response.ok) {
    throw new Error("migrate failed");
  }
  const payload = (await response.json()) as Partial<HydratedStores>;
  if (!payload.chat || !payload.mcp) {
    throw new Error("migrate payload invalid");
  }
  return { chat: payload.chat, mcp: payload.mcp };
}

/** 최초 1회 localStorage → Supabase 이관 후, 이후 저장은 DB가 원본이다. */
export function hydrateFromRemote(): Promise<HydratedStores> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const local = readLocalSnapshot();
    try {
      const remote = await migrateLocal(local);
      applyRemoteSnapshot(remote);
      bindPersistListeners();
      return remote;
    } catch {
      bindPersistListeners();
      return {
        chat: local.chat,
        mcp: {
          version: 1,
          servers: local.mcp.servers,
          desiredConnections: local.mcp.desiredConnections,
          disabledChatTools: local.mcp.disabledChatTools,
          secretFlags: {},
        },
      };
    }
  })();

  return inFlight;
}
