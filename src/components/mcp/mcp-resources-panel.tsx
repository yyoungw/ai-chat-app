"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";

import { McpResultBlock } from "@/components/mcp/mcp-result-block";
import { Button } from "@/components/ui/button";
import { listResources, readResource } from "@/lib/mcp/host-client";
import { cn } from "@/lib/utils";
import type { McpResource } from "@/lib/types/mcp";

type McpResourcesPanelProps = {
  serverId: string;
  enabled: boolean;
};

export function McpResourcesPanel({
  serverId,
  enabled,
}: McpResourcesPanelProps) {
  const [resources, setResources] = useState<McpResource[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listing, setListing] = useState(true);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
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
        const next = await listResources(serverId);
        if (cancelled) return;
        setResources(next);
        setSelectedUri(next[0]?.uri ?? null);
        setResult(undefined);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setListError(
          err instanceof Error ? err.message : "목록을 불러오지 못했습니다."
        );
        setResources([]);
      } finally {
        if (!cancelled) setListing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serverId, enabled]);

  function selectResource(resource: McpResource) {
    setSelectedUri(resource.uri);
    setResult(undefined);
    setError(null);
  }

  async function invokeResource(resource: McpResource) {
    setSelectedUri(resource.uri);
    setRunning(true);
    setError(null);
    setResult(undefined);
    try {
      const next = await readResource(serverId, resource.uri);
      setResult(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "읽기에 실패했습니다.");
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

  if (resources.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        이 서버에 등록된 resource가 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {resources.map((resource) => {
        const active = resource.uri === selectedUri;
        return (
          <li key={resource.uri}>
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
                  onClick={() => selectResource(resource)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium text-slate-800">
                    {resource.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                    {resource.uri}
                  </p>
                  {resource.description ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                      {resource.description}
                    </p>
                  ) : null}
                </button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void invokeResource(resource)}
                  disabled={running}
                  aria-label={`${resource.name} 호출`}
                >
                  <Play className="size-3.5" />
                  호출
                </Button>
              </div>
              {active ? (
                <div className="mt-3 border-t border-white/60 pt-3">
                  <McpResultBlock
                    loading={running}
                    error={error}
                    result={result}
                    emptyLabel="호출하면 리소스 본문이 여기에 표시됩니다."
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
