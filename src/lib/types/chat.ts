import type { McpImagePart } from "@/lib/mcp/tool-content";

/** 채팅 메시지 역할 */
export type ChatRole = "user" | "assistant";

/** 채팅 타임라인에 붙는 MCP tool 실행 결과 */
export type McpToolResultStatus = "running" | "success" | "error";

export type McpToolResult = {
  serverName: string;
  toolName: string;
  status: McpToolResultStatus;
  result?: unknown;
  args?: unknown;
  images?: McpImagePart[];
};

/** UI·DB persist용 채팅 메시지 */
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  mcpResults?: McpToolResult[];
};

/** 개별 대화 스레드 */
export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

/** 다중 채팅 이력 스토어 */
export type ChatStore = {
  version: 2;
  activeId: string | null;
  threads: ChatThread[];
};

/** @deprecated v1 호환용 */
export type ChatSession = {
  version: 1;
  messages: ChatMessage[];
  updatedAt: number;
};

/** API 요청에 실을 최소 메시지 형태 */
export type ChatMessageInput = {
  role: ChatRole;
  content: string;
};
