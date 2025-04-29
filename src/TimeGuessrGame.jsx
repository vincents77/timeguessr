import { useEffect, useState } from 'react';
import supabase from './supabaseClient';
import MapboxMap from './components/MapboxMap';
import cityLookup from './assets/city_lookup.json';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

export default function TimeGuessrGame() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [event, setEvent] = useState(null);
  const [guessCoords, setGuessCoords] = useState(null);
  const [guessYear, setGuessYear] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [history, setHistory] = useState([]);
  const [defaultTimer, setDefaultTimer] = useState(30);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedEra, setSelectedEra] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [lastEntry, setLastEntry] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [revealMap, setRevealMap] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [retryCenter, setRetryCenter] = useState(null);
  const [retryZoom, setRetryZoom] = useState(null);
  const [shouldRecenter, setShouldRecenter] = useState(false);
  const [guessPlace, setGuessPlace] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return sessionStorage.getItem('sessionId') || null;
  });
  const [playedSlugs, setPlayedSlugs] = useState(new Set());
  const [sessionProgress, setSessionProgress] = useState({ played: 0, total: 0 });
  
  useEffect(() => {
    setSessionId(null);
    sessionStorage.removeItem('sessionId');
  }, [playerName]);

  useEffect(() => {
    const savedSlugs = JSON.parse(sessionStorage.getItem('playedSlugs') || '[]');
    setPlayedSlugs(new Set(savedSlugs));
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase.from('events').select('*');
      if (error) {
        console.error('❌ Error fetching events:', error.message);
        return;
      }
      const normalized = data.map(e => ({
        ...e,
        coords: Array.isArray(e.coords) ? e.coords : JSON.parse(e.coords),
      }));
      setEvents(normalized);
      setFilteredEvents(normalized);
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    let results = events;
    if (selectedTheme) results = results.filter(e => e.theme === selectedTheme);
    if (selectedEra) results = results.filter(e => e.era === selectedEra);
    if (selectedRegion) results = results.filter(e => e.region === selectedRegion);
    setFilteredEvents(results);
  }, [selectedTheme, selectedEra, selectedRegion, events]);

  useEffect(() => {
    if (timerActive && !submitted && timeLeft > 0) {
      const interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timeLeft, timerActive, submitted]);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const navigate = useNavigate();

  useEffect(() => {
    let finalized = false;
  
    const handleBeforeUnload = async (e) => {
      if (finalized) return;
      if (sessionId) {
        try {
          await finalizeSession();
          logEvent('session_finalize_auto', { sessionId });
          finalized = true;
        } catch (error) {
          console.error('Failed to auto-finalize session:', error);
        }
      }
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
  
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, history]);

  const distToZoom = (distanceKm) => {
    if (distanceKm < 2) return 16;
    if (distanceKm < 10) return 14;
    if (distanceKm < 50) return 12;
    if (distanceKm < 200) return 9;
    if (distanceKm < 1000) return 6;
    return 3;
  };

  const getRegionFromGuess = (cityGuess, countryGuess) => {
    if (!cityGuess && !countryGuess) return null;
  
    const guessCity = cityGuess?.trim().toLowerCase();
    const guessCountry = countryGuess?.trim().toLowerCase();

    console.log('Guess City:', guessCity);
    console.log('Guess Country:', guessCountry);
  
    if (guessCity) {
      const foundCity = cityLookup.find(
        (c) => c.city.toLowerCase() === guessCity && c.country.toLowerCase() === guessCountry
      );
      if (foundCity) {
        console.log('Found city region:', foundCity.region);  // Log the found region
        return foundCity.region;
      }
    }
  
    const foundCountry = cityLookup.find(
      (c) => c.country.toLowerCase() === guessCountry
    );
    if (foundCountry) {
      console.log('Found country region:', foundCountry.region);  // Log the found region
      return foundCountry.region;
    }
  
    return null;
  };

  const fetchEraDuration = async (eraId) => {
    const { data, error } = await supabase
      .from('eras')
      .select('duration')  // Fetch the duration of the era
      .eq('id', eraId)      // Match the event's era_id
      .single();            // Get a single result (one era)
  
    if (error) {
      console.error("Error fetching era duration:", error.message);
      return null;
    }
  
    return data?.duration; // Return the duration of the era
  };

  const handlePlaceSearch = async () => {
    if (!guessPlace.trim()) return;
  
    setIsSearching(true);
    const encodedPlace = encodeURIComponent(guessPlace.trim());
  
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedPlace}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setGuessCoords([lat, lng]);
        console.log('📍 Found location:', lat, lng);
      } else {
        alert('❌ Location not found. Try being more specific.');
        setGuessPlace('');
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      alert('❌ Error searching location. Try again.');
      setGuessPlace('');
    }
  
    setIsSearching(false);
  };
  
  const calculateScore = ({ distance, yearDiff, eraDuration, guessRegion, actualRegion, guessCountry, actualCountry }) => {
    console.log('distance:', distance, 'yearDiff:', yearDiff, 'eraDuration:', eraDuration);
  
    if (eraDuration === 0) {
      console.error('Error: Era duration cannot be zero');
      return 0;
    }
    
    let baseScore = 2000;
  
    // Distance penalty
    baseScore -= distance * 2;
  
    // Year penalty relative to era size
    const maxYearPenalty = 500; // Limit maximum penalty for year differences
    const yearPenalty = Math.min((yearDiff / eraDuration) * 1000, maxYearPenalty);
    baseScore -= yearPenalty;

    // If the year difference is very small (less than 5 years), reduce the penalty
    if (yearDiff <= 5) {
    baseScore += 100;  // Small bonus if the guess is very close to the real year
    }
  
    // Region or country match bonuses
    if (guessCountry && guessCountry.toLowerCase() === actualCountry.toLowerCase()) {
      baseScore += 200; // Strong bonus for correct country
    } else if (guessRegion && guessRegion === actualRegion) {
      baseScore += 100; // Smaller bonus for correct region
    }
    
    console.log('Final score:', baseScore);

    return Math.max(0, Math.round(baseScore));
  };

  const createNewSession = async () => {
    const newSessionId = uuidv4();
    const { error } = await supabase.from('sessions').insert([
      {
        id: newSessionId,
        player_name: playerName || "Anonymous",
        started_at: new Date().toISOString(),
        theme: selectedTheme || null,
        era: selectedEra || null,
        region: selectedRegion || null,
      }
    ]);
  
    if (error) {
      console.error('❌ Error creating session:', error.message);
      alert('⚠️ Could not start session. Please retry.');
      return null;
    }
  
    console.log('🎯 New session created:', newSessionId);
    localStorage.setItem('sessionId', newSessionId);
    return newSessionId;
  };

  const startGame = async () => {
    if (!playerName.trim()) {
      alert("⚠️ Please enter your player name before starting!");
      return;
    }
  
    let activeSessionId = sessionStorage.getItem('sessionId');
  
    if (!activeSessionId) {
      const newId = await createNewSession();
      if (!newId) return; // Stop if creation failed
      sessionStorage.setItem('sessionId', newId);
      setSessionId(newId);
    } else {
      console.log('🔁 Reusing active session:', activeSessionId);
      setSessionId(activeSessionId);
    }
  
    // Then continue game start...
    let results = events;
    let playedSlugs = new Set();
    try {
      const storedPlayed = JSON.parse(sessionStorage.getItem('playedSlugs'));
      if (Array.isArray(storedPlayed)) {
        playedSlugs = new Set(storedPlayed);
      }
    } catch (e) {
      console.error('Error loading playedSlugs from sessionStorage:', e);
    }
    if (selectedTheme) results = results.filter(e => e.theme === selectedTheme);
    if (selectedEra) results = results.filter(e => e.era === selectedEra);
    if (selectedRegion) results = results.filter(e => e.region === selectedRegion);
    results = results.filter(e => !playedSlugs.has(e.slug));
  
    if (results.length === 0) {
      alert("⚠️ No events match your filters. Adjust filters to continue.");
      return;
    }
  
    const next = results[Math.floor(Math.random() * results.length)];
    setEvent(next);
    setSessionProgress({
      played: 0,
      total: results.length
    });
    setGuessCoords(null);
    setGuessYear('');
    setGuessPlace('');
    setSubmitted(false);
    setTimeLeft(defaultTimer);
    setGameStarted(true);
    setTimerActive(true);
    setShowModal(false);
    setRetryCount(0);
  };

  const pickNextFilteredEvent = () => {
    let playedSlugs = new Set();
    try {
      const storedPlayed = JSON.parse(sessionStorage.getItem('playedSlugs'));
      if (Array.isArray(storedPlayed)) {
        playedSlugs = new Set(storedPlayed);
      }
    } catch (e) {
      console.error('Error loading playedSlugs from sessionStorage:', e);
    }
  
    // Filter out already played events
    const remaining = filteredEvents.filter(e => !playedSlugs.has(e.slug));
  
    if (remaining.length === 0) {
      const hasFilter = selectedTheme || selectedEra || selectedRegion;
      alert(
        hasFilter
          ? "🎯 You've completed all matching events. Try adjusting the filters to explore more!"
          : "🎯 You've played all available events for now. More will be added soon!"
      );
      return;
    }
  
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    setEvent(next);
    setGuessCoords(null);
    setGuessYear('');
    setGuessPlace('');
    setSubmitted(false);
    setAccepted(false);
    setTimeLeft(defaultTimer);
    setGameStarted(true);
    setTimerActive(true);
    setShowModal(false);
    setRetryCount(0);
  };

  const handleSubmit = async () => {
    const dist = getDistance(...guessCoords, ...event.coords);
    const yearDiff = Math.abs(event.year - parseInt(guessYear));
    const timeToGuess = defaultTimer - timeLeft;
    const eraDuration = await fetchEraDuration(event.era_id);

    if (eraDuration === null) {
      console.error("Failed to fetch era duration.");
      return;
    }

    const entry = {
      player_name: playerName || 'Anonymous',
      slug: event.slug,
      title: event.title,
      actual_year: parseInt(event.year),
      guess_year: parseInt(guessYear),
      actual_coords: event.coords.join(','),
      guess_coords: guessCoords.join(','),
      distance: Number(dist.toFixed(1)),
      year_diff: parseInt(yearDiff),
      score: calculateScore({
        distance: dist,
        yearDiff,
        eraDuration: eraDuration,
        guessRegion: getRegionFromGuess(event.city, event.country),
        actualRegion: event.region,
        guessCountry: event.country,   // Using country info from the event (could improve later)
        actualCountry: event.country,
      }),
      time_to_guess: parseInt(timeToGuess),
      notable_location: event.notable_location || null,
      city: event.city || null,
      country: event.country || null,
      region: event.region || null,
      attempt_number: retryCount + 1,
    };
  
    setLastEntry(entry); // Save but don't insert yet
    setSubmitted(true);
    setTimerActive(false);
    setShowModal(true);
    setAccepted(false);
  };

  const handleAcceptResult = async () => {
    if (!lastEntry) return;
  
    const entryWithSession = {
      ...lastEntry,
      session_id: sessionId,
    };
  
    const { error } = await supabase.from('results').insert([entryWithSession]);
    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return;
    }
  
    // Update both history and played slugs
    setHistory(prev => {
      const updatedHistory = [...prev, entryWithSession];
      const updatedSlugs = updatedHistory.map(h => h.slug);
      sessionStorage.setItem('playedSlugs', JSON.stringify(updatedSlugs));
      setPlayedSlugs(new Set(updatedSlugs));
      return updatedHistory;
    });
    setSessionProgress(prev => ({
      ...prev,
      played: prev.played + 1
    }));
    setAccepted(true);
    setRevealMap(true);
  };

  const finalizeSession = async () => {
    if (!sessionId) {
      console.warn("⚠️ No active session to finalize.");
      return;
    }
  
    // Case: No guesses made
    if (history.length === 0) {
      const { error } = await supabase
        .from('sessions')
        .update({
          ended_at: new Date().toISOString(),
          completed: false,
        })
        .eq('id', sessionId);
  
      if (error) {
        console.error('❌ Failed to finalize empty session:', error.message);
      } else {
        console.log('✅ Empty session finalized with completed: false');
      }
  
    // Store sessionId so we can still show it on scoreboard
    localStorage.setItem("sessionId", sessionId);
    sessionStorage.removeItem("sessionId");
    sessionStorage.removeItem("playedSlugs");
    setSessionId(null);
    setPlayedSlugs(new Set());
    return;
  }
  
    // Step 1: Group by slug and find best score per event
    const bestScoresBySlug = {};
    history.forEach(entry => {
      const slug = entry.slug;
      const clampedScore = Math.max(entry.score || 0, 0);
      if (!bestScoresBySlug[slug] || clampedScore > bestScoresBySlug[slug]) {
        bestScoresBySlug[slug] = clampedScore;
      }
    });
  
    // Step 2: Aggregate session stats
    const totalEvents = Object.keys(bestScoresBySlug).length;
    const totalPoints = Object.values(bestScoresBySlug).reduce((sum, score) => sum + score, 0);
    const averageScore = totalEvents > 0 ? totalPoints / totalEvents : 0;
  
    // Step 3: Analyze metadata
    const summarizeFilter = (values, selected) => {
      if (!selected) return "all";
      const unique = [...new Set(values.filter(Boolean))];
      return unique.length === 1 ? unique[0] : "mixed";
    };
  
    const finalTheme = summarizeFilter(history.map(e => e.theme), selectedTheme);
    const finalEra = summarizeFilter(history.map(e => e.era), selectedEra);
    const finalRegion = summarizeFilter(history.map(e => e.region), selectedRegion);
  
    // Step 4: Final update
    const sessionData = {
      total_events: totalEvents,
      total_points: Math.round(totalPoints),
      average_score: Math.round(averageScore),
      ended_at: new Date().toISOString(),
      completed: true,
      theme: finalTheme,
      era: finalEra,
      region: finalRegion,
    };
  
    const { error } = await supabase
      .from('sessions')
      .update(sessionData)
      .eq('id', sessionId);
  
    if (error) {
      console.error('❌ Failed to finalize session:', error.message);
      return;
    }
  
    console.log('✅ Session finalized and saved.', sessionData);

      // 💾 Persist for /scoreboard highlighting
  localStorage.setItem("sessionId", sessionId);
  
    // Cleanup
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('playedSlugs');
    setSessionId(null);
    setPlayedSlugs(new Set());
  };

  const logEvent = async (eventType, payload = {}) => {
    console.log(`[LOG] ${eventType}`, payload);
  
    try {
      await supabase.from('logs').insert([
        {
          event_type: eventType,
          session_id: payload.sessionId || null,
          player_name: payload.playerName || null,
          payload,
        }
      ]);
    } catch (error) {
      console.error('❌ Failed to save log to Supabase:', error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 relative overflow-hidden">
      <h1 className="text-3xl font-bold mb-2">TimeGuessr</h1>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {/* Filters group */}
        <div className="flex flex-wrap items-center gap-2">
          <select className="border p-2 rounded" onChange={e => setSelectedTheme(e.target.value)}>
            <option value="">🎯 All Themes</option>
            {[...new Set(events.map(e => e.theme))].map(t => <option key={t}>{t}</option>)}
          </select>

          <select className="border p-2 rounded" onChange={e => setSelectedEra(e.target.value)}>
            <option value="">⏳ All Eras</option>
            {[...new Set(events.map(e => e.era))].map(t => <option key={t}>{t}</option>)}
          </select>

          <select className="border p-2 rounded" onChange={e => setSelectedRegion(e.target.value)}>
            <option value="">🌍 All Regions</option>
            {[...new Set(events.map(e => e.region))].map(t => <option key={t}>{t}</option>)}
          </select>

          <input className="border rounded px-2 py-1" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Player Name" />
        </div>

        <div className="flex items-center gap-4 min-w-[280px]">
          <button
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 whitespace-nowrap"
            onClick={startGame}
          >
            ▶️ Start Guessing
          </button>
          {gameStarted && (
            <div className="flex-1 text-sm text-gray-600">
              <div className="mb-1">Progress: {sessionProgress.played} / {sessionProgress.total}</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(sessionProgress.played / sessionProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {event && gameStarted && (
  <>
    <div className="flex flex-col lg:flex-row gap-6 max-w-[90vw] mx-auto">
      {/* Left: Image */}
      <div className="lg:w-1/2 w-full h-auto aspect-[1/1]">
        <img
          src={event.image_url}
          alt="event"
          className="w-full h-full object-cover rounded shadow"
        />
      </div>

      {/* Right: Map + Place Search */}
      <div className="lg:w-1/2 w-full h-auto aspect-[1/1]">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="font-semibold text-xl">📍 Place your location guess:</h2>
            <input
              type="text"
              className="border p-1 rounded text-sm"
              value={guessPlace}
              onChange={e => setGuessPlace(e.target.value)}
              placeholder="Enter city, country, or landmark"
            />
            <button
              onClick={handlePlaceSearch}
              className="bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 text-sm"
              disabled={isSearching}
            >
              {isSearching ? '...' : '🔍'}
            </button>
          </div>

          <MapboxMap
            guessCoords={guessCoords}
            setGuessCoords={setGuessCoords}
            event={event}
            retryCenter={retryCenter}
            retryZoom={retryZoom}
            shouldRecenter={shouldRecenter}
            onRecenterComplete={() => setShouldRecenter(false)}
          />
        </div>
      </div>
    </div>

    {/* Input Section (Year Guess) */}
    <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center">
      <input
        type="number"
        className="border w-full sm:w-64 p-2 rounded"
        value={guessYear}
        onChange={e => setGuessYear(e.target.value)}
        placeholder="Year (e.g. 1789 or -753)"
      />
      <button
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        onClick={handleSubmit}
        disabled={!guessCoords || !guessYear}
      >
        Submit Guess
      </button>
    </div>
  </>
)}

    {showModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
        <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg text-center space-y-3 z-[101]">
          <h2 className="text-xl font-bold">📜 Your Results</h2>
          <p>✅ <strong>{event.title}</strong></p>
          <p>📏 Distance: {getDistance(...guessCoords, ...event.coords).toFixed(1)} km</p>
          <p>📆 Year Difference: {Math.abs(event.year - parseInt(guessYear)) === 0 ? 'Perfect!' : `${Math.abs(event.year - parseInt(guessYear))} year(s)`}</p>
          {console.log('🔍 Debug lastEntry:', lastEntry)}
          <p>🏆 Score: {lastEntry?.score}</p>
          <p className="text-sm text-gray-600 italic">🔁 Attempt {retryCount + 1} of 3</p>

          {(retryCount >= 2 || accepted) ? (
            <>
              <p>📍 Location: {[event.notable_location, event.city, event.country].filter(Boolean).join(', ')}</p>
              <p>⏳ Year: {event.year < 0 ? `${-event.year} BCE` : `${event.year} CE`}</p>
              {!revealMap ? (
                <button
                  onClick={() => setRevealMap(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  🗺️ Reveal Map
                </button>
              ) : (
                <MapboxMap
                  guessCoords={guessCoords}
                  actualCoords={event.coords}
                  isResult
                />
              )}
            </>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center">
            {!accepted && retryCount < 2 && (
              <button
                onClick={() => {
                  setRetryCount(c => c + 1);
                  if (guessCoords) {
                    const dist = getDistance(...guessCoords, ...event.coords);
                    const zoom = distToZoom(dist * 2);
                    setRetryCenter(guessCoords);
                    setRetryZoom(zoom);
                    setShouldRecenter(true);
                  }
                  setSubmitted(false);
                  setTimeLeft(defaultTimer);
                  setTimerActive(true);
                  setShowModal(false);
                  setAccepted(false);
                  setRevealMap(false);
                }}
                className="bg-white text-black border border-black px-4 py-2 rounded hover:bg-gray-100"
              >
                🔁 Retry Guess
              </button>
            )}

            {!accepted && (
              <button
                onClick={handleAcceptResult}
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
              >
                ✅ Accept Result
              </button>
            )}

            {accepted && (
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => {
                    setLastEntry(null);
                    setShowModal(false);
                    setRevealMap(false);
                    setRetryCount(0);
                    pickNextFilteredEvent();
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  ▶️ Play Next Event
                </button>

                <button
                  onClick={async () => {
                    await finalizeSession();
                    logEvent('session_finalize_manual', { sessionId });
                    setLastEntry(null);
                    setShowModal(false);
                    setRevealMap(false);
                    setRetryCount(0);
                    setHistory([]);
                    setGameStarted(false);
                    navigate("/scoreboard");  // 👈 redirect here
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  🏁 Finish Session
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }