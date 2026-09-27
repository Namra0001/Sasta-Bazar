import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/** Build profile row fields from auth user (signup metadata + email). */
export function profilePayloadFromUser(user: User) {
  const meta = user.user_metadata || {};
  const full_name =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    "";
  const mobile_no =
    (typeof meta.mobile === "string" && meta.mobile.trim()) ||
    (typeof meta.mobile_no === "string" && meta.mobile_no.trim()) ||
    "";
  const email = user.email?.trim() || "";
  return {
    user_id: user.id,
    full_name: full_name || null,
    mobile_no: mobile_no || null,
    email: email || null,
  };
}

/** Upsert public.profiles from the current session user (call after login / signup verify). */
export async function syncProfileFromCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: null as Error | null };

  const payload = profilePayloadFromUser(user);
  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "user_id",
  });

  return { error };
}
