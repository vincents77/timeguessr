// /pages/api/player-summary.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export default async function handler(req, res) {
  const { player_name } = req.query;

  if (!player_name) {
    return res.status(400).json({ error: "Missing player_name parameter" });
  }

  const { data: sessions, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("player_name", player_name);

  if (sessionError || !sessions) {
    return res.status(500).json({ error: sessionError?.message });
  }

  const sessionIds = sessions.map((s) => s.id);

  const { data: results, error: resultsError } = await supabase
    .from("results")
    .select("score, distance, year_diff, time_to_guess, attempt_number")
    .in("session_id", sessionIds);

  if (resultsError || !results) {
    return res.status(500).json({ error: resultsError?.message });
  }

  // Aggregate stats
  const totalGames = sessions.length;
  const totalEvents = results.length;
  const totalPoints = results.reduce((sum, r) => sum + (r.score || 0), 0);
  const totalTime = results.reduce((sum, r) => sum + (r.time_to_guess || 0), 0);
  const bestScore = Math.max(...results.map((r) => r.score || 0));

  const averageScore = totalEvents > 0 ? totalPoints / totalEvents : 0;
  const averageTime = totalEvents > 0 ? totalTime / totalEvents : 0;
  const averageDistance = totalEvents > 0 ? results.reduce((sum, r) => sum + (r.distance || 0), 0) / totalEvents : 0;
  const averageYearDiff = totalEvents > 0 ? results.reduce((sum, r) => sum + (r.year_diff || 0), 0) / totalEvents : 0;
  const averageAttempts = totalEvents > 0 ? results.reduce((sum, r) => sum + (r.attempt_number || 1), 0) / totalEvents : 0;

  const nearGuesses = results.filter((r) => r.distance <= 50).length;
  const yearCloseGuesses = results.filter((r) => Math.abs(r.year_diff) <= 100).length;
  const perfectGuesses = results.filter(
    (r) => r.distance <= 10 && Math.abs(r.year_diff) <= 5
  ).length;

  return res.status(200).json({
    player_name,
    totalGames,
    totalEvents,
    totalPoints,
    averageScore,
    bestScore,
    totalTime,
    averageTime,
    averageDistance,
    averageYearDiff,
    averageAttempts,
    nearGuesses,
    yearCloseGuesses,
    perfectGuesses,
  });
}