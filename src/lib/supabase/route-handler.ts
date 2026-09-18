import "server-only";

import { createAppError } from "@/lib/errors";
import { isAppError, jsonError } from "@/lib/mcp/http";

export async function handleStorageRoute(
  run: () => Promise<Response>
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (isAppError(error)) return jsonError(error);
    return jsonError(
      createAppError("SERVER_ERROR", 500, "저장소 요청에 실패했습니다.")
    );
  }
}
