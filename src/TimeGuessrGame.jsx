import { useEffect, useState } from 'react';
import supabase from './supabaseClient';
import MapboxMap from './components/MapboxMap';
import cityLookup from './assets/city_lookup.json';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import GuessResultModal from './components/GuessResultModal';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import { useSession } from './hooks/useSession';

export default function TimeGuessrGame() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [event, setEvent] = useState(null);
  const [guessCoords, setGuessCoords] = useState(null);
  const [guessYear, setGuessYear] = useState('');
  const [submitted, setSubmitted] = useState(false);
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
  const [showFullCaption, setShowFullCaption] = useState(false);
  const playerName = sessionStorage.getItem('playerName') || 'Anonymous';
  const mode = sessionStorage.getItem('mode') || 'endless';
  const targetEventsRaw = sessionStorage.getItem('targetEvents');
  const targetEvents = targetEventsRaw ? Number(targetEventsRaw) : null;
  const [showFinalSummary, setShowFinalSummary] = useState(false);
  
  useEffect(() => {
    setSessionId(null);
    sessionStorage.removeItem('sessionId');
  }, [playerName]);

  useEffect(() => {
    if (playerName) {
      sessionStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  useEffect(() => {
    const savedSlugs = JSON.parse(sessionStorage.getItem('playedSlugs') || '[]');
    setPlayedSlugs(new Set(savedSlugs));
  }, []);

  useEffect(() => {
    setSessionProgress({
      played: history.length,
      total: targetEvents || filteredEvents.length,
    });
  }, [history, targetEvents, filteredEvents]);

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase.from('events').select('*');
      if (error) {
        console.error('❌ Error fetching events:', error.message);
        return;
      }
  
      const normalized = data.map((e) => {
        let coords = [0, 0];
      
        try {
          if (Array.isArray(e.coords)) {
            coords = e.coords.map(Number); // Ensure numeric
          } else if (typeof e.coords === "string") {
            if (e.coords.trim().startsWith("[")) {
              coords = JSON.parse(e.coords); // "[lat, lng]"
            } else {
              const parts = e.coords.split(",").map(p => parseFloat(p.trim()));
              coords = parts;
            }
          }
        } catch (err) {
          console.warn(`⚠️ Could not parse coords for "${e.title}":`, e.coords, err);
        }
      
        if (!Array.isArray(coords) || coords.length !== 2 || coords.some(isNaN)) {
          console.warn(`⚠️ Malformed coords for "${e.title}":`, coords);
          coords = [0, 0]; // fallback
        }
      
        return { ...e, coords };
      });
  
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

  const {
    createNewSession,
    updateSessionProgress,
    finalizeSession
  } = useSession({
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
  });

  const IconLocation = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6zm0 8a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  );

  const IconCalendar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
      <path d="M6 2a1 1 0 00-1 1v1H5a3 3 0 00-3 3v9a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3h-.002V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" />
    </svg>
  );

  const IconTrophy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 4V2H8v2H2v4a6 6 0 006 6c0 .7.1 1.3.4 1.9C8 16.6 7 18.1 7 20h10c0-1.9-1-3.4-1.4-4.1.3-.6.4-1.2.4-1.9a6 6 0 006-6V4h-6zM6 10a4 4 0 01-4-4V6h4v4zm12 0a4 4 0 01-4-4V6h4v4z"/>
    </svg>
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionId = sessionStorage.getItem("sessionId");
      if (sessionId) {
        navigator.sendBeacon(
          "https://zmvfnefkksnxiqdcgemc.functions.supabase.co/finalize_session",
          JSON.stringify({ session_id: sessionId })
        );
      }
    };
  
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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

  const startGame = async () => {
    const effectivePlayerName = sessionStorage.getItem("playerName") || playerName || "Anonymous";

  
    sessionStorage.setItem("playerName", effectivePlayerName);
  
    let activeSessionId = sessionStorage.getItem("sessionId");
  
    if (!activeSessionId) {
      const newId = await createNewSession(effectivePlayerName); // pass explicitly
      if (!newId) return;
      sessionStorage.setItem("sessionId", newId);
      setSessionId(newId);
    } else {
      console.log("🔁 Reusing active session:", activeSessionId);
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
      total: targetEvents || results.length
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
    if (!event || !guessCoords || guessCoords.length !== 2) {
      console.warn("⚠️ Cannot submit — missing event or guessCoords");
      return;
    }
  
    let eventCoords;
  
    if (Array.isArray(event.coords)) {
      eventCoords = event.coords;
    } else if (typeof event.coords === 'string') {
      try {
        eventCoords = event.coords.split(',').map(p => parseFloat(p.trim()));
      } catch (err) {
        console.warn(`⚠️ Could not parse coords for ${event.title}`);
        eventCoords = [0, 0];
      }
    } else {
      eventCoords = [0, 0];
    }
  
    console.log('Coords before distance:', guessCoords, eventCoords);
  
    const dist = getDistance(...guessCoords, ...eventCoords);
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
  
    const { data, error } = await supabase
      .from('results')
      .insert([entryWithSession])
      .select()
      .single();
  
    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return;
    }
  
    const entryWithId = { ...entryWithSession, id: data.id };
    const updatedHistory = [...history, entryWithId];
    const updatedSlugs = updatedHistory.map(h => h.slug);
  
    sessionStorage.setItem('playedSlugs', JSON.stringify(updatedSlugs));
    setPlayedSlugs(new Set(updatedSlugs));
    setHistory(updatedHistory);
    setAccepted(true);
    setRevealMap(true);
  
    await updateSessionProgress(sessionId, updatedHistory);
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

  function FinalSummaryModal({ onConfirm }) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow-xl text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">🎉 Challenge Complete!</h2>
          <p className="mb-4">You finished all {targetEvents} rounds. Ready to see your score?</p>
          <button
            onClick={onConfirm}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Go to Scoreboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 relative overflow-hidden">
      <h1 className="text-3xl font-bold mb-2">MapThePast</h1>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {/* Filters group */}
        <div className="flex flex-wrap items-center gap-2">
          <select className="border p-2 rounded" onChange={e => setSelectedTheme(e.target.value)}>
            <option value="">All Themes</option>
            {[...new Set(events.map(e => e.theme))].map(t => <option key={t}>{t}</option>)}
          </select>

          <select className="border p-2 rounded" onChange={e => setSelectedEra(e.target.value)}>
            <option value="">All Eras</option>
            {[...new Set(events.map(e => e.era))].map(t => <option key={t}>{t}</option>)}
          </select>

          <select className="border p-2 rounded" onChange={e => setSelectedRegion(e.target.value)}>
            <option value="">All Regions</option>
            {[...new Set(events.map(e => e.region))].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-4 min-w-[280px]">
          <button
            onClick={startGame}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4l12 8-12 8z" />
              </svg>Start Guessing
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[90vw] mx-auto">
      {/* Left column */}
      <div className="flex flex-col">
        <div className="min-h-[4.5rem] mb-2">
          <p className="text-lg font-semibold">Your visual clue</p>
          <p className="text-sm text-gray-600">Watch carefully! You can zoom in.</p>
        </div>
        <div className="aspect-square overflow-hidden rounded shadow">
          <Zoom>
            <img
              src={event.image_url}
              alt="event"
              className="w-full h-full object-cover cursor-zoom-in"
            />
          </Zoom>
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-col">
        <div className="min-h-[4.5rem] mb-2">
          <label className="text-lg font-semibold block">
            Guess the location: pin it on the map or enter a place
          </label>
          <div className="flex mt-2">
            <input
              type="text"
              className="border p-2 rounded-l text-sm w-full"
              value={guessPlace}
              onChange={e => setGuessPlace(e.target.value)}
              placeholder="Enter city, country, or landmark"
            />
            <button
              onClick={handlePlaceSearch}
              className="bg-gray-200 border-l border-gray-300 px-3 py-2 rounded-r hover:bg-gray-300 text-gray-700 text-sm"
              disabled={isSearching}
            >
              {isSearching ? '...' : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="aspect-square overflow-hidden rounded shadow">
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

    {/* Input Section */}
    <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center">
      <input
        type="number"
        className="border w-full sm:w-64 p-2 rounded"
        value={guessYear}
        onChange={(e) => setGuessYear(e.target.value)}
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
        <GuessResultModal
          event={event}
          guessCoords={guessCoords}
          guessYear={guessYear}
          lastEntry={lastEntry}
          retryCount={retryCount}
          accepted={accepted}
          revealMap={revealMap}
          showFullCaption={showFullCaption}
          setShowFullCaption={setShowFullCaption}
          onRetry={() => {
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
          onAccept={handleAcceptResult}
          onRevealMap={() => setRevealMap(true)}
          isLastRound={targetEvents && sessionProgress.played >= targetEvents}
          onConfirmLastEvent={() => {
            setShowModal(false);
            setTimeout(() => setShowFinalSummary(true), 300); // Optional delay
          }}
          onPlayNext={() => {
            if (targetEvents && history.length >= targetEvents) {
              setShowModal(false); // Hide result modal first
              setTimeout(() => setShowFinalSummary(true), 300); // Small delay to avoid flash
              return;
            }
          
            setLastEntry(null);
            setShowModal(false);
            setRevealMap(false);
            setRetryCount(0);
            pickNextFilteredEvent();
          }}
          onFinishSession={async () => {
            await finalizeSession(sessionId, history, selectedTheme, selectedEra, selectedRegion, playerName);
            logEvent('session_finalize_manual', { sessionId });
            setLastEntry(null);
            setShowModal(false);
            setRevealMap(false);
            setRetryCount(0);
            setHistory([]);
            setGameStarted(false);
            navigate("/scoreboard");
          }}
          onEarlyExit={async () => {
            await finalizeSession(sessionId, history, selectedTheme, selectedEra, selectedRegion, playerName);
            logEvent('session_finalize_manual_early_exit', { sessionId });
            setLastEntry(null);
            setShowModal(false);
            setRevealMap(false);
            setRetryCount(0);
            setHistory([]);
            setGameStarted(false);
            navigate("/scoreboard");
          }}
          IconLocation={IconLocation}
          IconCalendar={IconCalendar}
          IconTrophy={IconTrophy}
          playerName={playerName}
        />
      )}
      {showFinalSummary && (
        <FinalSummaryModal
          onConfirm={async () => {
            await finalizeSession(sessionId, history, selectedTheme, selectedEra, selectedRegion, playerName);
            logEvent("session_finalize_auto", { sessionId });
            setShowFinalSummary(false);
            setHistory([]);
            setGameStarted(false);
            navigate("/scoreboard");
          }}
        />
      )}
            </div>
  );
}