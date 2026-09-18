import { chatToolKey } from "@/lib/mcp/chat-tool-key";
import type {
  McpPersistSnapshot,
  McpServerConfig,
  McpServerDraft,
  McpServerStore,
  McpTransport,
} from "@/lib/types/mcp";

export const MCP_STORAGE_KEY = "ai-chat-app:mcp-servers:v1";
/** 사용자가 연결해 둔 서버 id만. 시크릿은 넣지 않는다. */
export const MCP_DESIRED_CONNECTIONS_KEY = "ai-chat-app:mcp-desired-connections:v1";
/** 채팅에서 끄고 싶은 tool 키(serverId::toolName). 기본은 전부 활성. */
export const MCP_CHAT_DISABLED_TOOLS_KEY =
  "ai-chat-app:mcp-chat-disabled-tools:v1";

export const EMPTY_MCP_STORE: McpServerStore = {
  version: 1,
  servers: [],
};

function isTransport(value: unknown): value is McpTransport {
  return value === "stdio" || value === "streamable-http";
}

function isServerConfig(value: unknown): value is McpServerConfig {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.id !== "string" || s.id.length === 0) return false;
  if (typeof s.name !== "string" || s.name.trim().length === 0) return false;
  if (!isTransport(s.transport)) return false;
  if (typeof s.createdAt !== "number" || typeof s.updatedAt !== "number") {
    return false;
  }
  if (s.command !== undefined && typeof s.command !== "string") return false;
  if (s.url !== undefined && typeof s.url !== "string") return false;
  if (s.args !== undefined) {
    if (!Array.isArray(s.args) || !s.args.every((a) => typeof a === "string")) {
      return false;
    }
  }
  return true;
}

export function parseMcpStore(data: unknown): McpServerStore | null {
  if (typeof data !== "object" || data === null) return null;
  const store = data as Record<string, unknown>;
  if (store.version !== 1 || !Array.isArray(store.servers)) return null;
  if (!store.servers.every(isServerConfig)) return null;
  return { version: 1, servers: store.servers };
}

function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function parseMcpSnapshot(data: unknown): McpPersistSnapshot | null {
  const store = parseMcpStore(data);
  if (!store) return null;
  const rec = data as Record<string, unknown>;
  const secretFlags: Record<string, boolean> = {};
  if (
    typeof rec.secretFlags === "object" &&
    rec.secretFlags !== null &&
    !Array.isArray(rec.secretFlags)
  ) {
    for (const [key, flag] of Object.entries(
      rec.secretFlags as Record<string, unknown>
    )) {
      if (flag === true) secretFlags[key] = true;
    }
  }
  return {
    version: 1,
    servers: store.servers,
    desiredConnections: parseIdList(rec.desiredConnections),
    disabledChatTools: parseIdList(rec.disabledChatTools),
    secretFlags,
  };
}

function parseStore(raw: string): McpServerStore | null {
  try {
    return parseMcpStore(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function createServerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** args 한 줄을 공백 기준으로 배열로 변환한다. */
export function parseArgsLine(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/);
}

export function formatArgsLine(args: string[] | undefined): string {
  return (args ?? []).join(" ");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** 폼 검증. 성공 시 null, 실패 시 사용자용 메시지. */
export function validateMcpServerDraft(
  draft: McpServerDraft,
  servers: McpServerConfig[],
  editingId?: string
): string | null {
  const name = draft.name.trim();
  if (!name) return "서버 이름을 입력하세요.";
  if (name.length > 64) return "서버 이름은 64자 이하여야 합니다.";

  const duplicated = servers.some(
    (server) =>
      server.id !== editingId &&
      server.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (duplicated) return "같은 이름의 서버가 이미 있습니다.";

  if (draft.transport === "stdio") {
    if (!draft.command.trim()) return "stdio command를 입력하세요.";
    return null;
  }

  const url = draft.url.trim();
  if (!url) return "Streamable HTTP URL을 입력하세요.";
  if (!isHttpUrl(url)) return "http 또는 https URL을 입력하세요.";
  return null;
}

/** 시크릿 필드를 제외한 persist용 레코드를 만든다. */
export function draftToServerConfig(
  draft: McpServerDraft,
  existing?: McpServerConfig
): McpServerConfig {
  const now = Date.now();
  const id = existing?.id ?? createServerId();
  const createdAt = existing?.createdAt ?? now;
  const name = draft.name.trim();

  if (draft.transport === "stdio") {
    return {
      id,
      name,
      transport: "stdio",
      command: draft.command.trim(),
      args: parseArgsLine(draft.argsLine),
      createdAt,
      updatedAt: now,
    };
  }

  return {
    id,
    name,
    transport: "streamable-http",
    url: draft.url.trim(),
    createdAt,
    updatedAt: now,
  };
}

export function loadMcpStore(): McpServerStore {
  if (typeof window === "undefined") {
    return { version: 1, servers: [] };
  }

  try {
    const raw = window.localStorage.getItem(MCP_STORAGE_KEY);
    if (!raw) return { version: 1, servers: [] };
    return parseStore(raw) ?? { version: 1, servers: [] };
  } catch {
    return { version: 1, servers: [] };
  }
}

type McpPersistListener = () => void;
let mcpPersistListener: McpPersistListener | null = null;

export function setMcpPersistListener(listener: McpPersistListener | null): void {
  mcpPersistListener = listener;
}

function notifyMcpPersist(): void {
  mcpPersistListener?.();
}

export function saveMcpStoreLocal(store: McpServerStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota 초과 등은 무시 (MVP)
  }
}

export function saveMcpStore(store: McpServerStore): void {
  saveMcpStoreLocal(store);
  notifyMcpPersist();
}

export function upsertServer(
  store: McpServerStore,
  server: McpServerConfig
): McpServerStore {
  const exists = store.servers.some((item) => item.id === server.id);
  const servers = exists
    ? store.servers.map((item) => (item.id === server.id ? server : item))
    : [server, ...store.servers];
  return { version: 1, servers };
}

export function deleteServer(
  store: McpServerStore,
  serverId: string
): McpServerStore {
  return {
    version: 1,
    servers: store.servers.filter((item) => item.id !== serverId),
  };
}

export function loadDesiredConnections(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MCP_DESIRED_CONNECTIONS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function saveDesiredConnectionsLocal(ids: string[]): void {
  saveIdListLocal(MCP_DESIRED_CONNECTIONS_KEY, ids);
}

export function saveDesiredConnections(ids: string[]): void {
  saveDesiredConnectionsLocal(ids);
  notifyMcpPersist();
}

export function rememberDesiredConnection(serverId: string): void {
  const ids = new Set(loadDesiredConnections());
  ids.add(serverId);
  saveDesiredConnections([...ids]);
}

export function forgetDesiredConnection(serverId: string): void {
  saveDesiredConnections(
    loadDesiredConnections().filter((id) => id !== serverId)
  );
}

function loadIdList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

function saveIdListLocal(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {
    // quota 초과 등은 무시 (MVP)
  }
}

function saveIdList(key: string, ids: string[]): void {
  saveIdListLocal(key, ids);
  notifyMcpPersist();
}

export function saveDisabledChatToolsLocal(ids: string[]): void {
  saveIdListLocal(MCP_CHAT_DISABLED_TOOLS_KEY, ids);
}

const CHAT_TOOLS_CHANGED = "ai-chat-app:mcp-chat-tools-changed";

export function loadDisabledChatTools(): string[] {
  return loadIdList(MCP_CHAT_DISABLED_TOOLS_KEY);
}

export type EnabledChatTool = {
  serverId: string;
  toolName: string;
};

/** 전송 직전 localStorage를 읽어, 연결된 tool 중 켜진 것만 남긴다. */
export function loadEnabledChatTools(
  available: EnabledChatTool[]
): EnabledChatTool[] {
  const disabled = new Set(loadDisabledChatTools());
  return available.filter(
    (tool) => !disabled.has(chatToolKey(tool.serverId, tool.toolName))
  );
}

export function setChatToolDisabled(
  serverId: string,
  toolName: string,
  disabled: boolean
): void {
  const ids = new Set(loadDisabledChatTools());
  const key = chatToolKey(serverId, toolName);
  if (disabled) ids.add(key);
  else ids.delete(key);
  saveIdList(MCP_CHAT_DISABLED_TOOLS_KEY, [...ids]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHAT_TOOLS_CHANGED));
  }
}

export function subscribeChatToolsChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHAT_TOOLS_CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHAT_TOOLS_CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}
