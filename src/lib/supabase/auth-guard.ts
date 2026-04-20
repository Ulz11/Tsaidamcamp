import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Returns the authenticated user, or a 401 response if there isn't one.
 * Use in /api routes that mutate data:
 *
 *   const auth = await requireUser(supabase);
 *   if (auth instanceof NextResponse) return auth;
 *   const user = auth;
 */
export async function requireUser(
  supabase: SupabaseClient
): Promise<User | NextResponse> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return user;
}
