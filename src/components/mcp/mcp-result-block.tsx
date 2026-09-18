import { McpImageList } from "@/components/mcp/mcp-image-list";
import { parseMcpToolResult } from "@/lib/mcp/tool-content";

type McpResultBlockProps = {
  loading: boolean;
  error: string | null;
  result: unknown;
  emptyLabel: string;
};

export function McpResultBlock({
  loading,
  error,
  result,
  emptyLabel,
}: McpResultBlockProps) {
  if (loading) {
    return (
      <p className="rounded-lg border border-white/60 bg-white/50 px-3 py-6 text-center text-xs text-slate-500">
        실행 중…
      </p>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive"
      >
        {error}
      </p>
    );
  }

  if (result === undefined) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-white/40 px-3 py-6 text-center text-xs text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  const parsed = parseMcpToolResult(result);

  return (
    <div className="grid gap-2">
      {parsed.images.length > 0 ? (
        <McpImageList images={parsed.images} alt="도구 결과 이미지" />
      ) : null}
      {parsed.text || parsed.images.length === 0 ? (
        <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
          {parsed.text || JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
