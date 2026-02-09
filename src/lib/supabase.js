import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";

let client;

export function getSupabase() {
  if (!client) {
    client = createPagesBrowserClient();
  }
  return client;
}
