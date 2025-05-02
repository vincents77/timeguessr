// File: src/hooks/useSession.js

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../supabaseClient';

function logSupabaseError(context, error) {
  console.error(`❌ ${context}:`, error.message);
}

export function useSession({
    playerName,
    selectedTheme,
    selectedEra,
    selectedRegion,
    sessionId,
    setSessionId,
    setPlayedSlugs,
    setHistory,
    mode,
    targetEvents,
    history,
  }) {
    const createNewSession = useCallback(async (playerNameOverride) => {
        const newSessionId = uuidv4();
        const finalPlayerName = playerNameOverride || playerName || "Anonymous";
      
        const { error } = await supabase.from('sessions').insert([
          {
            id: newSessionId,
            player_name: finalPlayerName,
            started_at: new Date().toISOString(),
            theme: selectedTheme || null,
            era: selectedEra || null,
            region: selectedRegion || null,
            mode: mode || 'endless',
            target_events: targetEvents || null,
            status: 'active',
            completed: false,
          }
        ]);
      
        if (error) {
          logSupabaseError('Error creating session', error);
          return null;
        }
      
        localStorage.setItem('sessionId', newSessionId);
        return newSessionId;
      }, [playerName, selectedTheme, selectedEra, selectedRegion, mode, targetEvents]);

  const updateSessionProgress = useCallback(async (sessionId, history) => {
    if (!sessionId || !Array.isArray(history)) {
      console.warn('⚠️ updateSessionProgress called with invalid inputs', { sessionId, history });
      return;
    }
  
    const bestScores = {};
    history.forEach(entry => {
      const slug = entry.slug;
      const score = Math.max(entry.score || 0, 0);
      if (!bestScores[slug] || score > bestScores[slug]) {
        bestScores[slug] = score;
      }
    });
  
    const totalEvents = Object.keys(bestScores).length;
    const totalPoints = Object.values(bestScores).reduce((a, b) => a + b, 0);
    const averageScore = totalEvents > 0 ? totalPoints / totalEvents : 0;
  
    const { error } = await supabase.from('sessions').update({
      total_events: totalEvents,
      total_points: Math.round(totalPoints),
      average_score: Math.round(averageScore),
      status: 'active',
    }).eq('id', sessionId);
  
    if (error) {
      console.error('❌ Failed to update session live:', error.message);
    }
  }, []);

  const finalizeSession = useCallback(
    async (sessionId, history, selectedTheme, selectedEra, selectedRegion, playerNameOverride) => {
      const summarizeFilter = (values, selected) => {
        if (!selected) return "all";
        const unique = [...new Set(values.filter(Boolean))];
        return unique.length === 1 ? unique[0] : "mixed";
      };
  
      if (!sessionId) return;
  
      if (!history || history.length === 0) {
        const { error } = await supabase.from('sessions').update({
          ended_at: new Date().toISOString(),
          completed: false,
          status: 'abandoned',
          player_name: playerNameOverride || 'Anonymous',
        }).eq('id', sessionId);
  
        if (error) logSupabaseError('Failed to finalize empty session', error);
  
        localStorage.setItem('sessionId', sessionId);
        sessionStorage.setItem('sessionId', sessionId);
        return;
      }
  
      const bestScores = {};
      history.forEach(entry => {
        const slug = entry.slug;
        const score = Math.max(entry.score || 0, 0);
        if (!bestScores[slug] || score > bestScores[slug]) {
          bestScores[slug] = score;
        }
      });
  
      const totalEvents = Object.keys(bestScores).length;
      const totalPoints = Object.values(bestScores).reduce((a, b) => a + b, 0);
      const averageScore = totalEvents > 0 ? totalPoints / totalEvents : 0;
  
      const sessionData = {
        total_events: totalEvents,
        total_points: Math.round(totalPoints),
        average_score: Math.round(averageScore),
        ended_at: new Date().toISOString(),
        completed: true,
        status: 'completed',
        player_name: playerNameOverride || 'Anonymous',
        theme: summarizeFilter(history.map(e => e.theme), selectedTheme),
        era: summarizeFilter(history.map(e => e.era), selectedEra),
        region: summarizeFilter(history.map(e => e.region), selectedRegion),
      };
  
      const { error } = await supabase.from('sessions').update(sessionData).eq('id', sessionId);
      if (error) logSupabaseError('Final session update failed', error);
  
      localStorage.setItem('sessionId', sessionId);
      sessionStorage.setItem('sessionId', sessionId);
    },
    []
  );

  const resumeSession = useCallback(() => {
    return sessionStorage.getItem('sessionId') || localStorage.getItem('sessionId') || null;
  }, []);

  return {
    createNewSession,
    updateSessionProgress,
    finalizeSession,
    resumeSession,
  };
}