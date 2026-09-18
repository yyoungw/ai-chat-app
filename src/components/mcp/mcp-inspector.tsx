"use client";

import { BookOpen, FolderOpen, Plug, Unplug, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";

import { McpPromptsPanel } from "@/components/mcp/mcp-prompts-panel";
import { McpResourcesPanel } from "@/components/mcp/mcp-resources-panel";
import { McpToolsPanel } from "@/components/mcp/mcp-tools-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { parseKvLinesDetailed } from "@/lib/mcp/json-args";
import { cn } from "@/lib/utils";
import type {
  McpConnectionStatus,
  McpServerConfig,
  McpSessionSecrets,
} from "@/lib/types/mcp";

const TRANSPORT_LABEL: Record<McpServerConfig["transport"], string> = {
  stdio: "stdio",
  "streamable-http": "Streamable HTTP",
};

type CatalogKind = "tools" | "prompts" | "resources";

type McpInspectorProps = {
  server: McpServerConfig | null;
  status: McpConnectionStatus;
  errorMessage: string | null;
  connecting: boolean;
  hasStoredSecrets?: boolean;
  onConnect: (secrets?: McpSessionSecrets, persistSecrets?: boolean) => void;
  onDisconnect: () => void;
};

export function McpInspector(props: McpInspectorProps) {
  return <McpInspectorPanel key={props.server?.id ?? "none"} {...props} />;
}

function McpInspectorPanel({
  server,
  status,
  errorMessage,
  connecting,
  hasStoredSecrets = false,
  onConnect,
  onDisconnect,
}: McpInspectorProps) {
  const connected = status === "connected";
  const [headersText, setHeadersText] = useState("");
  const [envText, setEnvText] = useState("");
  const [ignoredHint, setIgnoredHint] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogKind>("tools");
  const [persistSecrets, setPersistSecrets] = useState(false);

  function handleConnect() {
    if (!server) return;
    const parsed =
      server.transport === "streamable-http"
        ? parseKvLinesDetailed(headersText)
        : parseKvLinesDetailed(envText);
    setIgnoredHint(
      parsed.ignoredCount > 0
        ? `무시된 줄이 있습니다 (${parsed.ignoredCount}줄). KEY=VALUE 형식을 확인하세요.`
        : null
    );
    const values = parsed.values;
    onConnect(
      {
        headers:
          server.transport === "streamable-http" && Object.keys(values).length > 0
            ? values
            : undefined,
        env:
          server.transport === "stdio" && Object.keys(values).length > 0
            ? values
            : undefined,
      },
      persistSecrets
    );
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/45 shadow-sm backdrop-blur-xl">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/40 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-800">
            {server ? server.name : "서버를 선택하세요"}
          </h2>
          {server ? (
            <p className="truncate text-xs text-slate-500">
              {TRANSPORT_LABEL[server.transport]}
              {server.transport === "stdio"
                ? ` · ${[server.command, ...(server.args ?? [])].join(" ")}`
                : ` · ${server.url ?? ""}`}
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              좌측에서 서버를 고르거나 새로 등록하세요.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={server ? status : "disconnected"} />
          <Button
            type="button"
            size="sm"
            onClick={handleConnect}
            disabled={!server || connecting || connected}
          >
            <Plug className="size-4" />
            연결
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDisconnect}
            disabled={!server || status === "disconnected" || connecting}
          >
            <Unplug className="size-4" />
            해제
          </Button>
        </div>
      </header>

      {server && !connected ? (
        <div className="grid shrink-0 gap-2 border-b border-white/40 px-4 py-3">
          {server.transport === "streamable-http" ? (
            <>
              <Label htmlFor="mcp-session-headers">세션 헤더 (KEY=VALUE)</Label>
              <Textarea
                id="mcp-session-headers"
                value={headersText}
                onChange={(event) => setHeadersText(event.target.value)}
                placeholder={"x-hf-token=hf_xxx"}
                className="min-h-16 font-mono text-xs"
                autoComplete="off"
                disabled={connecting}
              />
            </>
          ) : (
            <>
              <Label htmlFor="mcp-session-env">세션 env (KEY=VALUE)</Label>
              <Textarea
                id="mcp-session-env"
                value={envText}
                onChange={(event) => setEnvText(event.target.value)}
                placeholder={"API_KEY=..."}
                className="min-h-16 font-mono text-xs"
                autoComplete="off"
                disabled={connecting}
              />
            </>
          )}
          {ignoredHint ? (
            <p className="text-[11px] text-amber-700" role="status">
              {ignoredHint}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="mcp-persist-secrets" className="text-[11px] text-slate-600">
              세션 시크릿을 DB에 저장
            </Label>
            <Switch
              id="mcp-persist-secrets"
              checked={persistSecrets}
              onCheckedChange={(checked) => setPersistSecrets(Boolean(checked))}
              size="sm"
              disabled={connecting}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {hasStoredSecrets
              ? "저장된 시크릿이 있습니다. 비워 두면 저장된 값으로 연결합니다."
              : "기본은 저장하지 않습니다. 켜면 이 워크스페이스 DB에만 보관합니다."}
          </p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        {!server ? (
          <EmptyState
            title="선택된 서버가 없습니다"
            body="서버를 추가한 뒤 연결하면 인스펙터를 사용할 수 있습니다."
          />
        ) : connecting ? (
          <EmptyState title="연결 중" body="MCP 서버에 연결하는 중입니다." />
        ) : status === "error" ? (
          <ErrorBanner
            message={errorMessage ?? "다시 연결하거나 서버 설정을 확인하세요."}
            disabled={connecting}
            onRetry={handleConnect}
          />
        ) : !connected ? (
          <EmptyState
            title="먼저 서버를 연결하세요"
            body="연결되면 Tools, Prompts, Resources를 버튼으로 직접 호출할 수 있습니다."
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="grid shrink-0 grid-cols-3 gap-1.5">
              <CatalogButton
                active={catalog === "tools"}
                onClick={() => setCatalog("tools")}
                icon={<Wrench className="size-4" />}
                label="Tools"
                hint="실행"
              />
              <CatalogButton
                active={catalog === "prompts"}
                onClick={() => setCatalog("prompts")}
                icon={<BookOpen className="size-4" />}
                label="Prompts"
                hint="가져오기"
              />
              <CatalogButton
                active={catalog === "resources"}
                onClick={() => setCatalog("resources")}
                icon={<FolderOpen className="size-4" />}
                label="Resources"
                hint="읽기"
              />
            </div>
            <p className="shrink-0 text-[11px] text-slate-500">
              항목의 「호출」 버튼으로 실제 응답을 확인하세요. 인자가 있으면 JSON을 채운 뒤
              다시 호출하면 됩니다.
            </p>
            <div className="min-h-0 flex-1 overflow-auto">
              {catalog === "tools" ? (
                <McpToolsPanel serverId={server.id} enabled={connected} />
              ) : catalog === "prompts" ? (
                <McpPromptsPanel serverId={server.id} enabled={connected} />
              ) : (
                <McpResourcesPanel serverId={server.id} enabled={connected} />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CatalogButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      onClick={onClick}
      className={cn("h-auto min-h-11 flex-col gap-0.5 py-2", !active && "bg-white/60")}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={cn("text-[10px] font-normal", active ? "opacity-80" : "text-slate-500")}>
        {hint}
      </span>
    </Button>
  );
}

function StatusBadge({ status }: { status: McpConnectionStatus }) {
  if (status === "connected") return <Badge>연결됨</Badge>;
  if (status === "connecting") return <Badge variant="secondary">연결 중</Badge>;
  if (status === "error") return <Badge variant="destructive">오류</Badge>;
  return <Badge variant="outline">미연결</Badge>;
}

function ErrorBanner({
  message,
  disabled,
  onRetry,
}: {
  message: string;
  disabled: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
    >
      <div>
        <p className="text-sm font-medium text-slate-800">연결 실패</p>
        <p className="mt-1 text-xs text-slate-600">{message}</p>
      </div>
      <Button type="button" size="sm" onClick={onRetry} disabled={disabled}>
        <Plug className="size-4" />
        다시 연결
      </Button>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-52 flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="max-w-sm text-xs text-slate-500">{body}</p>
    </div>
  );
}
