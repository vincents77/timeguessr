from supabase import create_client, Client

# Environment
VITE_SUPABASE_URL = "https://zmvfnefkksnxiqdcgemc.supabase.co"
VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptdmZuZWZra3NueGlxZGNnZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1NTQ4NTYsImV4cCI6MjA2MDEzMDg1Nn0.4rdm7z7sJywxBQJrO-QMK0SDE5rYOo-kwYTYXkXcDWI"

supabase: Client = create_client(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

# Check current role
role_resp = supabase.rpc("get_current_role").execute()
print("🔐 Supabase role is:", role_resp)

response = supabase.table("feedback").insert({
    "feedback": "Insert with dummy slug",
    "event_slug": "dummy-slug-direct",
    "player_name": "Vincent"
}).execute()

result_check = supabase.table("results").select("*").eq("id", "49f55cf2-0f09-4cfc-bcc2-78cbb8e1bab3").execute()
print("Results visibility:", result_check)

print("📥 Insert response:", insert_resp)