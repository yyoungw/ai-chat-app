/** 앱 공통 에러 코드 */
export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "ABORTED";

export type AppError = {
  code: AppErrorCode;
  message: string;
  status: number;
};

const MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHORIZED: "인증에 실패했습니다. API 키를 확인해 주세요.",
  FORBIDDEN: "이 요청을 수행할 권한이 없습니다.",
  BAD_REQUEST: "요청이 올바르지 않습니다. 입력 내용을 확인해 주세요.",
  RATE_LIMITED: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  SERVER_ERROR: "서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  NETWORK_ERROR: "네트워크 연결에 문제가 있습니다. 연결을 확인해 주세요.",
  ABORTED: "응답 생성이 취소되었습니다.",
};

export function createAppError(
  code: AppErrorCode,
  status?: number,
  overrideMessage?: string
): AppError {
  const statusByCode: Record<AppErrorCode, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    BAD_REQUEST: 400,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
    NETWORK_ERROR: 503,
    ABORTED: 499,
  };

  return {
    code,
    message: overrideMessage ?? MESSAGES[code],
    status: status ?? statusByCode[code],
  };
}

/** HTTP 상태 → 앱 에러 */
export function mapHttpStatusToError(status: number): AppError {
  if (status === 401) return createAppError("UNAUTHORIZED", 401);
  if (status === 403) return createAppError("FORBIDDEN", 403);
  if (status === 429) return createAppError("RATE_LIMITED", 429);
  if (status >= 400 && status < 500) return createAppError("BAD_REQUEST", status);
  return createAppError("SERVER_ERROR", status >= 500 ? status : 500);
}

/** Gemini/프로바이더 예외 → 앱 에러 (민감 정보 마스킹) */
export function mapProviderError(error: unknown): AppError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return createAppError("ABORTED");
  }

  const anyErr = error as {
    status?: number;
    statusCode?: number;
    code?: number | string;
    message?: string;
  };

  const status =
    typeof anyErr?.status === "number"
      ? anyErr.status
      : typeof anyErr?.statusCode === "number"
        ? anyErr.statusCode
        : typeof anyErr?.code === "number"
          ? anyErr.code
          : undefined;

  if (status !== undefined) {
    return mapHttpStatusToError(status);
  }

  const raw = typeof anyErr?.message === "string" ? anyErr.message : "";
  const lower = raw.toLowerCase();

  if (lower.includes("api key") || lower.includes("unauthenticated") || lower.includes("401")) {
    return createAppError("UNAUTHORIZED");
  }
  if (lower.includes("permission") || lower.includes("403")) {
    return createAppError("FORBIDDEN");
  }
  if (lower.includes("quota") || lower.includes("rate") || lower.includes("429")) {
    return createAppError("RATE_LIMITED");
  }
  if (lower.includes("abort")) {
    return createAppError("ABORTED");
  }

  return createAppError("SERVER_ERROR");
}
