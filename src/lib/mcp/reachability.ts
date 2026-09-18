import type { McpServerConfig } from "@/lib/types/mcp";

const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
]);

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.trim().toLowerCase());
}

function isRemoteAppRuntime(): boolean {
  const onVercel =
    typeof process !== "undefined" && Boolean(process.env.VERCEL);
  if (onVercel) return true;
  if (typeof window === "undefined") return false;
  return !isLoopbackHostname(window.location.hostname);
}

function isLoopbackHttpTarget(server: McpServerConfig): boolean {
  if (server.transport !== "streamable-http" || !server.url) return false;
  try {
    return isLoopbackHostname(new URL(server.url).hostname);
  } catch {
    return false;
  }
}

/** 배포 호스트에서 localhost/stdio MCP는 연결할 수 없다. */
export function mcpReconnectBlockedReason(
  server: McpServerConfig
): string | null {
  if (!isRemoteAppRuntime()) return null;
  if (server.transport === "stdio") {
    return "배포 환경에서는 stdio MCP를 실행할 수 없습니다. 로컬에서 연결하세요.";
  }
  if (isLoopbackHttpTarget(server)) {
    return "이 MCP 주소는 localhost라서 배포 환경에서는 연결할 수 없습니다. 공개 URL로 바꾸거나 로컬에서 연결하세요.";
  }
  return null;
}
