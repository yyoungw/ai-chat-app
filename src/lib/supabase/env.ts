import "server-only";

import { createAppError } from "@/lib/errors";

/** Route Handler 전용. NEXT_PUBLIC 금지. */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw createAppError(
      "SERVER_ERROR",
      500,
      "Supabase 환경 변수가 없습니다. SUPABASE_URL, SUPABASE_ANON_KEY를 확인하세요."
    );
  }
  return { url, anonKey };
}
