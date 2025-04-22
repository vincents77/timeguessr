// App.jsx
import { useState, useEffect } from 'react';
import TimeGuessrGame from './TimeGuessrGame';
// import EventGenerator from './EventGenerator'; // Optional for later

export default function App() {
  const [screen, setScreen] = useState('game');

  useEffect(() => {
    // You could dynamically route or persist screen later
  }, []);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <TimeGuessrGame />
      {/* Optional dev toggle back in if needed:
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => setScreen('game')}
          className="px-3 py-1 rounded bg-blue-500 text-white"
        >
          Game
        </button>
        <button
          onClick={() => setScreen('generator')}
          className="px-3 py-1 rounded bg-pink-500 text-white"
        >
          Generator
        </button>
      </div>
      {screen === 'game' ? <TimeGuessrGame /> : <EventGenerator />} */}
    </main>
  );
}