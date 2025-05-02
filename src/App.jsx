// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import PreGameScreen from './pages/PreGameScreen';
import TimeGuessrGame from './TimeGuessrGame';
import Scoreboard from './pages/Scoreboard';
import GuessResultTest from './pages/GuessResultTest';

export default function App() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Routes>
        <Route path="/pregamescreen" element={<PreGameScreen />} />
        <Route path="/" element={<PreGameScreen />} />
        <Route path="/play" element={<TimeGuessrGame />} />
        <Route path="/scoreboard" element={<Scoreboard />} />
        <Route path="/modal-test" element={<GuessResultTest />} />
      </Routes>
    </main>
  );
}