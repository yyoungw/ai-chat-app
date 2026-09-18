import "server-only";

import { cookies } from "next/headers";

import { createAppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/client";

export const WORKSPACE_COOKIE = "ai-chat-workspace-id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseWorkspaceId(value: string | undefined): string | null {
  if (!value || !UUID_RE.test(value)) return null;
  return value;
}

/** 쿠키의 워크스페이스를 보장하고, 없으면 새로 만든다. */
export async function ensureWorkspaceId(): Promise<string> {
  const jar = await cookies();
  const existing = parseWorkspaceId(jar.get(WORKSPACE_COOKIE)?.value);

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("ensure_workspace", {
    p_id: existing ?? undefined,
  });

  if (error || typeof data !== "string" || !UUID_RE.test(data)) {
    throw createAppError(
      "SERVER_ERROR",
      500,
      "워크스페이스를 준비하지 못했습니다."
    );
  }

  if (data !== existing) {
    jar.set(WORKSPACE_COOKIE, data, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return data;
}
