import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("[supabase] URL:", supabaseUrl ?? "MISSING");
console.log("[supabase] Anon key present:", !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
