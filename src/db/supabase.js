const { createClient } = require("@supabase/supabase-js");

// Usar los nombres correctos de Railway
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug
console.log("🔵 Conectando a Supabase...");
console.log("URL exists:", !!supabaseUrl);
console.log("Key exists:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: Missing Supabase credentials");
  console.error("SUPABASE_URL:", process.env.SUPABASE_URL ? "✅" : "❌");
  console.error(
    "EXPO_PUBLIC_SUPABASE_URL:",
    process.env.EXPO_PUBLIC_SUPABASE_URL ? "✅" : "❌",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log("✅ Supabase connected");

module.exports = supabase;
