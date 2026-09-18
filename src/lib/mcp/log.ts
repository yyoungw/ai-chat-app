import "server-only";

/** 헤더/env 값은 로그에 남기지 않고 키 이름만 기록한다. */
export function secretKeys(record?: Record<string, string>): string[] {
  return Object.keys(record ?? {});
}

export function logMcp(event: string, meta?: Record<string, unknown>): void {
  console.info("[mcp-host]", event, meta ?? {});
}
