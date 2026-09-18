"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";

import { McpResultBlock } from "@/components/mcp/mcp-result-block";
import { McpToolEnableSwitch } from "@/components/mcp/mcp-tool-enable-switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { callTool, listTools } from "@/lib/mcp/host-client";
import { defaultJsonArgs, parseJsonArgs } from "@/lib/mcp/json-args";
import { cn } from "@/lib/utils";
import type { McpTool } from "@/lib/types/mcp";

type McpToolsPanelProps = {
  serverId: string;
  enabled: boolean;
};

export function McpToolsPanel({ serverId, enabled }: McpToolsPanelProps) {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listing, setListing] = useState(true);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [argsText, setArgsText] = useState("{}");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(undefined);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    void (async () => {
      setListing(true);
      setListError(null);
      try {
        const next = await listTools(serverId);
        if (cancelled) return;
        setTools(next);
        const first = next[0];
        setSelectedName(first?.name ?? null);
        setArgsText(defaultJsonArgs(first?.inputSchema));
        setResult(undefined);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setListError(
          err instanceof Error ? err.message : "목록을 불러오지 못했습니다."
        );
        setTools([]);
      } finally {
        if (!cancelled) setListing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serverId, enabled]);

  function selectTool(tool: McpTool) {
    setSelectedName(tool.name);
    setArgsText(defaultJsonArgs(tool.inputSchema));
    setResult(undefined);
    setError(null);
  }

  async function invokeTool(tool: McpTool) {
    const raw =
      tool.name === selectedName ? argsText : defaultJsonArgs(tool.inputSchema);
    setSelectedName(tool.name);
    setArgsText(raw);
    const parsed = parseJsonArgs(raw);
    if (parsed.error) {
      setError(parsed.error);
      setResult(undefined);
      return;
    }
    setRunning(true);
    setError(null);
    setResult(undefined);
    try {
      const next = await callTool(serverId, tool.name, parsed.args);
      setResult(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "실행에 실패했습니다.");
    } finally {
      setRunning(false);
    }
  }

  if (!enabled) return null;

  if (listing) {
    return <p className="py-8 text-center text-sm text-slate-500">불러오는 중…</p>;
  }

  if (listError) {
    return (
      <p role="alert" className="py-8 text-center text-sm text-destructive">
        {listError}
      </p>
    );
  }

  if (tools.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        이 서버에 등록된 tool이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tools.map((tool) => {
        const active = tool.name === selectedName;
        return (
          <li key={tool.name}>
            <article
              className={cn(
                "rounded-xl border p-3",
                active
                  ? "border-sky-200/80 bg-white/80 shadow-sm"
                  : "border-white/60 bg-white/40"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => selectTool(tool)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-mono text-sm font-medium text-slate-800">
                    {tool.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                    {tool.description}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] text-slate-500">채팅</span>
                  <McpToolEnableSwitch serverId={serverId} toolName={tool.name} />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void invokeTool(tool)}
                    disabled={running}
                    aria-label={`${tool.name} 호출`}
                  >
                    <Play className="size-3.5" />
                    호출
                  </Button>
                </div>
              </div>
              {active ? (
                <div className="mt-3 grid gap-2 border-t border-white/60 pt-3">
                  <Label htmlFor="mcp-tool-args">인자 (JSON)</Label>
                  <Textarea
                    id="mcp-tool-args"
                    value={argsText}
                    onChange={(event) => setArgsText(event.target.value)}
                    className="min-h-24 font-mono text-xs"
                  />
                  <McpResultBlock
                    loading={running}
                    error={error}
                    result={result}
                    emptyLabel="호출하면 결과가 여기에 표시됩니다."
                  />
                </div>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
