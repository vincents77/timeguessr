// supabase/functions/finalize_session/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { session_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("VITE_SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (!session_id) {
    return new Response(JSON.stringify({ error: "Missing session_id" }), { status: 400 });
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      ended_at: new Date().toISOString(),
      completed: false,
    })
    .eq("id", session_id)
    .is("ended_at", null); // Only update sessions that haven't been closed yet

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: `Session ${session_id} finalized.` }), {
    status: 200,
  });
});