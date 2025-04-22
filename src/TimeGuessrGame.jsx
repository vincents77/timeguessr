import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import supabase from './supabaseClient';

function MapSelector({ onSelect }) {
  useMapEvents({ click: (e) => onSelect([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function FitBounds({ coordsA, coordsB }) {
  const map = useMap();
  useEffect(() => {
    if (!coordsA || !coordsB) return;
    map.fitBounds([coordsA, coordsB], { padding: [50, 50] });
  }, [coordsA, coordsB, map]);
  return null;
}

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

  const startGame = () => {
    let results = events;
    if (selectedTheme) results = results.filter(e => e.theme === selectedTheme);
    if (selectedEra) results = results.filter(e => e.era === selectedEra);
    if (selectedRegion) results = results.filter(e => e.region === selectedRegion);

    if (filteredEvents.length === 0) {
      alert("⚠️ No events match your filters. Adjust filters to continue.");
      return;
    }
    const next = filteredEvents[Math.floor(Math.random() * filteredEvents.length)];
    setEvent(next);
    setGuessCoords(null);
    setGuessYear('');
    setSubmitted(false);
    setTimeLeft(defaultTimer);
    setGameStarted(true);
    setTimerActive(true);
    setShowModal(false);
  };

  const handleSubmit = async () => {
    const dist = getDistance(...guessCoords, ...event.coords);
    const yearDiff = Math.abs(event.year - parseInt(guessYear));
    const timeToGuess = defaultTimer - timeLeft;

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
      score: Math.max(0, Math.round(2000 - dist * 2 - yearDiff * 5)),
      time_to_guess: parseInt(timeToGuess),
      notable_location: event.notable_location || null,
      city: event.city || null,
      country: event.country || null,
      region: event.region || null
    };

    console.log("📤 Inserting to Supabase:", entry);

    const { error } = await supabase.from('results').insert([entry]);
    if (error) console.error('❌ Supabase insert error:', error.message);

    setHistory(prev => [...prev, entry]);
    setSubmitted(true);
    setTimerActive(false);
    setShowModal(true);
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

        <button
            className="bg-black text-white p-2 px-4 rounded hover:bg-gray-800"
            onClick={startGame}
        >
            ▶️ Start Guessing
        </button>

        <input
            className="border rounded px-2 py-1"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Player Name"
        />
        </div>

      {event && gameStarted && (
        <>
          <img src={event.image_url} className="rounded shadow w-full max-h-[70vh] object-cover" alt="event" />

          <div className="md:flex gap-6">
            <div className="flex-1 z-10">
              <h2 className="font-semibold text-xl mb-2">📍 Place your location guess:</h2>
              <MapContainer center={[20, 0]} zoom={2} className="w-full h-[70vh] rounded">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <MapSelector onSelect={setGuessCoords} />
                {guessCoords && <Marker position={guessCoords}><Popup>Your Guess</Popup></Marker>}
              </MapContainer>
            </div>

            <div className="w-full md:w-64 space-y-4 mt-6 md:mt-0">
              <input type="number" className="border w-full p-2 rounded" value={guessYear} onChange={e => setGuessYear(e.target.value)} placeholder="Year (e.g. 1789 or -753)" />
              <button className="bg-blue-600 text-white p-2 rounded w-full" onClick={handleSubmit} disabled={!guessCoords || !guessYear}>Submit Guess</button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg text-center space-y-3 z-[101]">
            <h2 className="text-xl font-bold">📜 Your Results</h2>
            <p>✅ <strong>{event.title}</strong></p>
            <p>📍 Location: {[event.notable_location, event.city, event.country].filter(Boolean).join(', ')}</p>
            <p>📏 Distance: {getDistance(...guessCoords, ...event.coords).toFixed(1)} km</p>
            <p>⏳ Year: {event.year < 0 ? `${-event.year} BCE` : `${event.year} CE`}</p>
            <p>📆 Year Difference: {Math.abs(event.year - parseInt(guessYear))} {Math.abs(event.year - parseInt(guessYear)) === 1 ? 'year' : 'years'}</p>
            <MapContainer center={event.coords} zoom={5} className="w-full h-64 rounded z-40">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={event.coords}><Popup>Actual</Popup></Marker>
              <Marker position={guessCoords}><Popup>Your Guess</Popup></Marker>
              <Polyline positions={[event.coords, guessCoords]} color="red" />
              <FitBounds coordsA={event.coords} coordsB={guessCoords} />
            </MapContainer>
            <button onClick={() => { setShowModal(false); startGame(); }} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              🔁 Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}