import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type SupabaseServerClient = SupabaseClient<Database>;

/** 세션을 브라우저에 저장하지 않는 서버 클라이언트 */
export function createSupabaseServerClient(): SupabaseServerClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
