"use client";

import { Wrench } from "lucide-react";

import { McpImageList } from "@/components/mcp/mcp-image-list";
import { Badge } from "@/components/ui/badge";
import { parseMcpToolResult } from "@/lib/mcp/tool-content";
import { cn } from "@/lib/utils";
import type { McpToolResult } from "@/lib/types/chat";

type McpResultCardProps = {
  result: McpToolResult;
};

function statusLabel(status: McpToolResult["status"]): string {
  if (status === "running") return "실행 중";
  if (status === "success") return "완료";
  return "오류";
}

function preview(value: unknown): string {
  if (value === undefined) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text.length > 600 ? `${text.slice(0, 600)}…` : text;
}

export function McpResultCard({ result }: McpResultCardProps) {
  const argsText = preview(result.args);
  const parsed = parseMcpToolResult(result.result);
  const body =
    typeof result.result === "string" ? result.result : parsed.text;
  const images = result.images?.length ? result.images : parsed.images;

  return (
    <div
      className={cn(
        "mt-2 rounded-xl border px-3 py-2 shadow-sm backdrop-blur-md",
        result.status === "error"
          ? "border-destructive/30 bg-destructive/10"
          : "border-white/50 bg-white/50"
      )}
    >
      <div className="flex items-center gap-2">
        <Wrench className="size-3.5 shrink-0 text-sky-700" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800">
          {result.serverName}
          <span className="mx-1 text-slate-400">·</span>
          <span className="font-mono">{result.toolName}</span>
        </p>
        <Badge
          variant={
            result.status === "error"
              ? "destructive"
              : result.status === "running"
                ? "secondary"
                : "default"
          }
        >
          {statusLabel(result.status)}
        </Badge>
      </div>
      {argsText ? (
        <div className="mt-1">
          <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
            인자
          </p>
          <pre className="max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-600">
            {argsText}
          </pre>
        </div>
      ) : null}
      {result.status === "running" && !body && images.length === 0 ? (
        <p className="mt-1 text-[11px] text-slate-500">도구를 실행하고 있습니다…</p>
      ) : null}
      {images.length > 0 ? (
        <McpImageList
          images={images}
          alt={`${result.toolName} 결과 이미지`}
        />
      ) : null}
      {body ? (
        <div className="mt-1">
          <p className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">
            결과
          </p>
          <pre
            className={cn(
              "max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed",
              result.status === "error" ? "text-destructive" : "text-slate-600"
            )}
          >
            {preview(body)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
