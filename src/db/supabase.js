const { createClient } = require("@supabase/supabase-js");

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;

// Prefer service role key (bypasses RLS — safe for server-side use only).
// Fall back to anon key if service role not configured yet.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug
console.log("🔵 Conectando a Supabase...");
console.log("URL exists:", !!supabaseUrl);
console.log(
  "Key type:",
  process.env.SUPABASE_SERVICE_ROLE_KEY ? "service_role ✅" : "anon (RLS activo ⚠️)"
);

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR: Missing Supabase credentials");
  console.error("SUPABASE_URL:", process.env.SUPABASE_URL ? "✅" : "❌");
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY:",
    process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌ (recomendado para servidor)"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log("✅ Supabase connected");

module.exports = supabase;
