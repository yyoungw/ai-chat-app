"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type McpConnectionBadgeProps = {
  count: number | null;
};

export function McpConnectionBadge({ count }: McpConnectionBadgeProps) {
  const label =
    count === null
      ? "MCP 확인 중"
      : count === 0
        ? "MCP 미연결"
        : `MCP ${count}대 연결`;

  return (
    <Badge
      variant={count && count > 0 ? "default" : "outline"}
      render={<Link href="/mcp" />}
      aria-label={`${label}. MCP 서버 관리로 이동`}
      className="h-7 cursor-pointer px-2.5"
    >
      {label}
    </Badge>
  );
}
