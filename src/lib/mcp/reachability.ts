import type { McpServerConfig } from "@/lib/types/mcp";

const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
]);

const BUILTIN_MCP_PATH = "/api/mcp";

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

function mcpPathname(url: URL): string {
  const path = url.pathname.replace(/\/+$/, "");
  return path.length > 0 ? path : "/";
}

/** 배포 중인 앱 origin. localhost는 치환 대상으로 쓰지 않는다. */
function publicAppOrigin(): string | null {
  if (typeof window !== "undefined") {
    if (isLoopbackHostname(window.location.hostname)) return null;
    return window.location.origin;
  }

  const raw =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }
  return `https://${raw}`;
}

export function isBuiltInLoopbackMcpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      isLoopbackHostname(parsed.hostname) &&
      mcpPathname(parsed) === BUILTIN_MCP_PATH
    );
  } catch {
    return false;
  }
}

/** 이 앱의 `/api/mcp`를 localhost로 저장한 경우, 배포 origin으로 바꾼다. */
export function resolveMcpConnectUrl(url: string): string {
  if (!isBuiltInLoopbackMcpUrl(url)) return url;
  const origin = publicAppOrigin();
  if (!origin) return url;
  return `${origin}${BUILTIN_MCP_PATH}`;
}

export function resolveMcpServerForConnect(
  server: McpServerConfig
): McpServerConfig {
  if (server.transport !== "streamable-http" || !server.url) return server;
  const nextUrl = resolveMcpConnectUrl(server.url);
  if (nextUrl === server.url) return server;
  return { ...server, url: nextUrl };
}

function isLoopbackHttpTarget(server: McpServerConfig): boolean {
  if (server.transport !== "streamable-http" || !server.url) return false;
  try {
    return isLoopbackHostname(new URL(server.url).hostname);
  } catch {
    return false;
  }
}

/** 배포 호스트에서 닿지 않는 localhost/stdio MCP는 연결하지 않는다. */
export function mcpReconnectBlockedReason(
  server: McpServerConfig
): string | null {
  const resolved = resolveMcpServerForConnect(server);
  if (!isRemoteAppRuntime()) return null;
  if (resolved.transport === "stdio") {
    return "배포 환경에서는 stdio MCP를 실행할 수 없습니다. 로컬에서 연결하세요.";
  }
  if (isLoopbackHttpTarget(resolved)) {
    return "이 MCP 주소는 localhost라서 배포 환경에서는 연결할 수 없습니다. 공개 URL로 바꾸거나 로컬에서 연결하세요.";
  }
  return null;
}
