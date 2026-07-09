/**
 * Supabase client — prepared but OPTIONAL.
 *
 * The current demo runs 100% in the browser and never requires Supabase.
 * `getSupabase()` returns null when env vars are absent, so no feature may
 * assume a connection. Future features (stem separation, scores,
 * multiplayer rooms) must degrade gracefully when it returns null.
 *
 * Env vars are documented in `.env.example`.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null | undefined;

export function getSupabase(): SupabaseClient<Database> | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  client = url && anonKey ? createClient<Database>(url, anonKey) : null;
  return client;
}

/** True when Supabase is configured (used to toggle future UI). */
export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
