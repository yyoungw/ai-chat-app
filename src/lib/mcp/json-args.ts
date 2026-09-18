import type { McpPrompt } from "@/lib/types/mcp";

/** inputSchema properties를 빈 문자열 기본값 JSON으로 만든다. */
export function defaultJsonArgs(schema?: Record<string, unknown>): string {
  if (!schema || typeof schema !== "object") return "{}";
  const properties = schema.properties;
  if (!properties || typeof properties !== "object") return "{}";
  const obj: Record<string, string> = {};
  for (const key of Object.keys(properties as Record<string, unknown>)) {
    obj[key] = "";
  }
  return JSON.stringify(obj, null, 2);
}

export function defaultPromptArgs(prompt: McpPrompt): string {
  const obj: Record<string, string> = {};
  for (const arg of prompt.arguments ?? []) {
    obj[arg.name] = "";
  }
  return JSON.stringify(obj, null, 2);
}

/** 인스펙터 JSON 인자. 깨진 JSON은 error로 돌린다. */
export function parseJsonArgs(raw: string): { args: unknown; error: string | null } {
  try {
    return { args: JSON.parse(raw) as unknown, error: null };
  } catch {
    return { args: null, error: "인자는 JSON 형식이어야 합니다." };
  }
}

/** KEY=VALUE 줄을 객체로 변환. 값은 persist하지 않는 세션 입력용. */
export function parseKvLines(raw: string): Record<string, string> {
  return parseKvLinesDetailed(raw).values;
}

export type KvParseResult = {
  values: Record<string, string>;
  ignoredCount: number;
};

export function parseKvLinesDetailed(raw: string): KvParseResult {
  const values: Record<string, string> = {};
  let ignoredCount = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      ignoredCount += 1;
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!key) {
      ignoredCount += 1;
      continue;
    }
    values[key] = value;
  }
  return { values, ignoredCount };
}
