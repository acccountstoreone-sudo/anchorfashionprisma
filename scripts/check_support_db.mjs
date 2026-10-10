import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const tables = [
    "support_tickets",
    "ticket_messages",
    "support_agents",
    "support_departments",
    "live_chats",
    "chat_conversations",
    "chat_messages",
    "chat_sessions"
  ];

  for (const t of tables) {
    const { data, error } = await adminClient.from(t).select("*");
    if (error) {
      console.log(`Table '${t}': error -> ${error.message}`);
    } else {
      console.log(`Table '${t}': count -> ${data.length}`);
      if (data.length > 0) {
        console.log(`Sample row in ${t}:`, data[0]);
      }
    }
  }
}

main().catch(console.error);
