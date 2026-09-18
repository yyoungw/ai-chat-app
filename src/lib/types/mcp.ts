/** MCP 전송 방식. stdio / Streamable HTTP만 지원한다. */
export type McpTransport = "stdio" | "streamable-http";

/** 인스펙터 연결 상태. persist 하지 않으며, 서버 세션과 hydrate로 맞춘다. */
export type McpConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/** 서버 메타. env / Authorization 헤더는 포함하지 않는다. */
export type McpServerConfig = {
  id: string;
  name: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  createdAt: number;
  updatedAt: number;
};

export type McpServerStore = {
  version: 1;
  servers: McpServerConfig[];
};

/** DB에 persist하는 MCP 설정 스냅샷. 시크릿 값은 넣지 않는다. */
export type McpPersistSnapshot = {
  version: 1;
  servers: McpServerConfig[];
  desiredConnections: string[];
  disabledChatTools: string[];
  secretFlags: Record<string, boolean>;
};

/** 등록/수정 폼 입력. argsLine은 공백 구분 문자열이다. */
export type McpServerDraft = {
  name: string;
  transport: McpTransport;
  command: string;
  argsLine: string;
  url: string;
};

export type McpTool = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
};

export type McpPromptArgument = {
  name: string;
  description?: string;
  required?: boolean;
};

export type McpPrompt = {
  name: string;
  description: string;
  arguments?: McpPromptArgument[];
};

export type McpResource = {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
};

export type McpCatalog = {
  tools: McpTool[];
  prompts: McpPrompt[];
  resources: McpResource[];
};

/** 연결 시에만 쓰는 시크릿. persist 금지. */
export type McpSessionSecrets = {
  headers?: Record<string, string>;
  env?: Record<string, string>;
};
