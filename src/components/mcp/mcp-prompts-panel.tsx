"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";

import { McpResultBlock } from "@/components/mcp/mcp-result-block";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPrompt, listPrompts } from "@/lib/mcp/host-client";
import { defaultPromptArgs, parseJsonArgs } from "@/lib/mcp/json-args";
import { cn } from "@/lib/utils";
import type { McpPrompt } from "@/lib/types/mcp";

type McpPromptsPanelProps = {
  serverId: string;
  enabled: boolean;
};

export function McpPromptsPanel({ serverId, enabled }: McpPromptsPanelProps) {
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);
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
        const next = await listPrompts(serverId);
        if (cancelled) return;
        setPrompts(next);
        const first = next[0];
        setSelectedName(first?.name ?? null);
        setArgsText(first ? defaultPromptArgs(first) : "{}");
        setResult(undefined);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setListError(
          err instanceof Error ? err.message : "목록을 불러오지 못했습니다."
        );
        setPrompts([]);
      } finally {
        if (!cancelled) setListing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serverId, enabled]);

  function selectPrompt(prompt: McpPrompt) {
    setSelectedName(prompt.name);
    setArgsText(defaultPromptArgs(prompt));
    setResult(undefined);
    setError(null);
  }

  async function invokePrompt(prompt: McpPrompt) {
    const raw =
      prompt.name === selectedName ? argsText : defaultPromptArgs(prompt);
    setSelectedName(prompt.name);
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
      const next = await getPrompt(serverId, prompt.name, parsed.args);
      setResult(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "가져오기에 실패했습니다.");
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

  if (prompts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        이 서버에 등록된 prompt가 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {prompts.map((prompt) => {
        const active = prompt.name === selectedName;
        return (
          <li key={prompt.name}>
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
                  onClick={() => selectPrompt(prompt)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-mono text-sm font-medium text-slate-800">
                    {prompt.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                    {prompt.description}
                  </p>
                </button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void invokePrompt(prompt)}
                  disabled={running}
                  aria-label={`${prompt.name} 호출`}
                >
                  <Play className="size-3.5" />
                  호출
                </Button>
              </div>
              {active ? (
                <div className="mt-3 grid gap-2 border-t border-white/60 pt-3">
                  <Label htmlFor="mcp-prompt-args">인자 (JSON)</Label>
                  <Textarea
                    id="mcp-prompt-args"
                    value={argsText}
                    onChange={(event) => setArgsText(event.target.value)}
                    className="min-h-24 font-mono text-xs"
                  />
                  <McpResultBlock
                    loading={running}
                    error={error}
                    result={result}
                    emptyLabel="호출하면 프롬프트 메시지가 여기에 표시됩니다."
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
