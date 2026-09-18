"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type McpConnectionBadgeProps = {
  connectedCount: number | null;
  registeredCount: number | null;
};

export function McpConnectionBadge({
  connectedCount,
  registeredCount,
}: McpConnectionBadgeProps) {
  const loading = connectedCount === null || registeredCount === null;
  const connected = connectedCount ?? 0;
  const registered = registeredCount ?? 0;
  const label = loading
    ? "MCP 확인 중"
    : connected > 0
      ? `MCP ${connected}대 연결`
      : registered > 0
        ? `MCP ${registered}대 등록 · 미연결`
        : "MCP 미연결";

  return (
    <Badge
      variant={connected > 0 ? "default" : "outline"}
      render={<Link href="/mcp" />}
      aria-label={`${label}. MCP 서버 관리로 이동`}
      className="h-7 cursor-pointer px-2.5"
    >
      {label}
    </Badge>
  );
}
