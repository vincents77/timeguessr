import { useEffect, useState } from 'react';
import supabase from './supabaseClient';
import MapboxMap from './components/MapboxMap';
import cityLookup from './assets/city_lookup.json';

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

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase.from('events').select('*');
      if (error) {
        console.error('❌ Error fetching events:', error.message);
        return;
      }
      const normalized = data.map(e => ({
        ...e,
        coords: e.coords?.split(',').map(Number) || [0, 0],
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

  const startGame = () => {
    let results = events;
    if (selectedTheme) results = results.filter(e => e.theme === selectedTheme);
    if (selectedEra) results = results.filter(e => e.era === selectedEra);
    if (selectedRegion) results = results.filter(e => e.region === selectedRegion);
    setAccepted(false);

    if (results.length === 0) {
      alert("⚠️ No events match your filters. Adjust filters to continue.");
      return;
    }
    const next = results[Math.floor(Math.random() * results.length)];
    setEvent(next);
    setGuessCoords(null);
    setGuessYear('');
    setSubmitted(false);
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
      player: playerName || 'Anonymous',
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
  };

  const handleAcceptResult = async () => {
    if (!lastEntry) return;
  
    const { error } = await supabase.from('results').insert([lastEntry]);
    if (error) console.error('❌ Supabase insert error:', error.message);
  
    setHistory(prev => [...prev, lastEntry]);
    setAccepted(true);
    setRevealMap(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 relative overflow-hidden">
      <h1 className="text-3xl font-bold mb-2">TimeGuessr</h1>

      <div className="flex flex-wrap gap-4 items-center">
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

        <button className="bg-black text-white p-2 px-4 rounded hover:bg-gray-800" onClick={startGame}>
          ▶️ Start Guessing
        </button>

        <input className="border rounded px-2 py-1" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Player Name" />
      </div>

      {event && gameStarted && (
        <>
          <div className="flex flex-col lg:flex-row gap-6 max-w-[90vw] mx-auto">
            {/* Left: Image */}
            <div className="lg:w-1/2 w-full h-auto aspect-[4/3]">
              <img
                src={event.image_url}
                alt="event"
                className="w-full h-full object-cover rounded shadow"
              />
            </div>

            {/* Right: Map */}
            <div className="lg:w-1/2 w-full h-auto aspect-[4/3]">
              <h2 className="font-semibold text-xl mb-2">📍 Place your location guess:</h2>
              <MapboxMap guessCoords={guessCoords} setGuessCoords={setGuessCoords} isStatic={true} event={event}/>
            </div>
          </div>

          {/* Input Section */}
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
        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg text-center space-y-3 z-[101]">
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
                  setGuessYear('');
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
              <button
                onClick={() => {
                  setLastEntry(null);
                  setShowModal(false);
                  setRevealMap(false);
                  startGame();   // NOW go to next event
                }}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ▶️ Play Next Event
              </button>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }