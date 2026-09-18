import { createAppError } from "@/lib/errors";
import { isAppError, jsonError } from "@/lib/mcp/http";
import { connectedServers } from "@/lib/mcp/host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** 연결 중인 서버 id만 반환. 시크릿은 포함하지 않는다. */
export async function GET() {
  try {
    const serverIds = connectedServers().map((server) => server.id);
    return Response.json(
      { serverIds },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    if (isAppError(error)) return jsonError(error);
    return jsonError(
      createAppError("SERVER_ERROR", 500, "MCP 세션 목록을 불러오지 못했습니다.")
    );
  }
}
