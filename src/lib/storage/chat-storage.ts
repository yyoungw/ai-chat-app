import type { ChatMessage, ChatStore, ChatThread } from "@/lib/types/chat";

export const CHAT_STORAGE_KEY_V1 = "ai-chat-app:session:v1";
export const CHAT_STORAGE_KEY = "ai-chat-app:store:v2";

const EMPTY_STORE: ChatStore = {
  version: 2,
  activeId: null,
  threads: [],
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    typeof m.createdAt === "number"
  );
}

function isChatThread(value: unknown): value is ChatThread {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    Array.isArray(t.messages) &&
    t.messages.every(isChatMessage) &&
    typeof t.createdAt === "number" &&
    typeof t.updatedAt === "number"
  );
}

export function parseChatStore(data: unknown): ChatStore | null {
  if (typeof data !== "object" || data === null) return null;
  const store = data as Record<string, unknown>;
  if (store.version !== 2 || !Array.isArray(store.threads)) return null;
  if (!store.threads.every(isChatThread)) return null;

  return {
    version: 2,
    activeId: typeof store.activeId === "string" ? store.activeId : null,
    threads: store.threads,
  };
}

function parseStore(raw: string): ChatStore | null {
  try {
    return parseChatStore(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/** v1 단일 세션 → v2 스토어 마이그레이션 */
function migrateFromV1(): ChatStore | null {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY_V1);
    if (!raw) return null;
    const data = JSON.parse(raw) as {
      version?: number;
      messages?: ChatMessage[];
      updatedAt?: number;
    };
    if (!Array.isArray(data.messages) || !data.messages.every(isChatMessage)) {
      return null;
    }
    if (data.messages.length === 0) return null;

    const now = data.updatedAt ?? Date.now();
    const id = createMessageId();
    const title = titleFromMessages(data.messages);
    const thread: ChatThread = {
      id,
      title,
      messages: data.messages,
      createdAt: data.messages[0]?.createdAt ?? now,
      updatedAt: now,
    };

    return { version: 2, activeId: id, threads: [thread] };
  } catch {
    return null;
  }
}

export function createMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 첫 사용자 메시지로 제목 생성 */
export function titleFromMessages(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim());
  if (!firstUser) return "새 채팅";
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 36 ? `${text.slice(0, 36)}…` : text;
}

export function createEmptyThread(): ChatThread {
  const now = Date.now();
  return {
    id: createMessageId(),
    title: "새 채팅",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** localStorage에서 전체 스토어 로드 */
export function loadChatStore(): ChatStore {
  if (typeof window === "undefined") return { ...EMPTY_STORE, threads: [] };

  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = parseStore(raw);
      if (parsed) return parsed;
    }

    const migrated = migrateFromV1();
    if (migrated) {
      saveChatStore(migrated);
      try {
        window.localStorage.removeItem(CHAT_STORAGE_KEY_V1);
      } catch {
        // ignore
      }
      return migrated;
    }

    return { ...EMPTY_STORE, threads: [] };
  } catch {
    return { ...EMPTY_STORE, threads: [] };
  }
}

type ChatPersistListener = (store: ChatStore) => void;
let chatPersistListener: ChatPersistListener | null = null;

/** hydrate 이후 remote sync 훅. local-only 저장은 호출하지 않는다. */
export function setChatPersistListener(
  listener: ChatPersistListener | null
): void {
  chatPersistListener = listener;
}

export function saveChatStoreLocal(store: ChatStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota 초과 등은 무시 (MVP)
  }
}

export function saveChatStore(store: ChatStore): void {
  saveChatStoreLocal(store);
  chatPersistListener?.(store);
}

/** 활성 스레드 메시지 갱신 후 저장 */
export function upsertActiveThread(
  store: ChatStore,
  messages: ChatMessage[],
  activeId: string | null
): ChatStore {
  const now = Date.now();

  if (!activeId) {
    if (messages.length === 0) {
      return { ...store, activeId: null };
    }
    const thread = createEmptyThread();
    thread.messages = messages;
    thread.title = titleFromMessages(messages);
    thread.updatedAt = now;
    return {
      version: 2,
      activeId: thread.id,
      threads: [thread, ...store.threads],
    };
  }

  const exists = store.threads.some((t) => t.id === activeId);
  if (!exists) {
    const thread: ChatThread = {
      id: activeId,
      title: titleFromMessages(messages) || "새 채팅",
      messages,
      createdAt: now,
      updatedAt: now,
    };
    return {
      version: 2,
      activeId,
      threads: [thread, ...store.threads],
    };
  }

  const threads = store.threads.map((t) => {
    if (t.id !== activeId) return t;
    return {
      ...t,
      messages,
      title:
        t.title === "새 채팅" || messages.length > 0
          ? titleFromMessages(messages) || t.title
          : t.title,
      updatedAt: now,
    };
  });

  // 최근 사용 순 정렬
  threads.sort((a, b) => b.updatedAt - a.updatedAt);

  return { version: 2, activeId, threads };
}

export function deleteThread(store: ChatStore, threadId: string): ChatStore {
  const threads = store.threads.filter((t) => t.id !== threadId);
  const activeId =
    store.activeId === threadId ? (threads[0]?.id ?? null) : store.activeId;
  return { version: 2, activeId, threads };
}

/** 하위 호환: 활성 세션 메시지만 필요할 때 */
export function loadChatSession(): { messages: ChatMessage[] } {
  const store = loadChatStore();
  const active = store.threads.find((t) => t.id === store.activeId);
  return { messages: active?.messages ?? [] };
}

export function saveChatSession(messages: ChatMessage[]): void {
  const store = loadChatStore();
  const next = upsertActiveThread(store, messages, store.activeId);
  saveChatStore(next);
}

export function clearChatSession(): void {
  const store = loadChatStore();
  if (!store.activeId) return;
  const next = deleteThread(store, store.activeId);
  // 빈 스레드로 교체하지 않고 삭제만 — UI에서 새 채팅 생성
  saveChatStore(next);
}
