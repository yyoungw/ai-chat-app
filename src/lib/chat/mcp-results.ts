import type { McpToolResult } from "@/lib/types/chat";

/** running 카드를 같은 서버/툴의 최종 상태로 교체한다. */
export function upsertMcpResult(
  prev: McpToolResult[] | undefined,
  next: McpToolResult
): McpToolResult[] {
  const list = [...(prev ?? [])];
  if (next.status === "running") {
    list.push(next);
    return list;
  }
  const index = list.findLastIndex(
    (item) =>
      item.serverName === next.serverName &&
      item.toolName === next.toolName &&
      item.status === "running"
  );
  if (index >= 0) {
    list[index] = {
      ...next,
      args: next.args ?? list[index].args,
      images: next.images ?? list[index].images,
    };
    return list;
  }
  list.push(next);
  return list;
}
