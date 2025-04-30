// src/pages/GuessResultTest.jsx
import GuessResultModal from "../components/GuessResultModal";
import { useState } from "react";

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

export default function GuessResultTest() {
  const [showModal, setShowModal] = useState(true);

  return (
    <div className="p-10">
      {showModal && (
        <GuessResultModal
            event={{
                title: "Fall of the Berlin Wall",
                year: 1989,
                caption: "The wall’s fall symbolized the end of the Cold War and the beginning of German reunification.",
                notable_location: "Checkpoint Charlie",
                city: "Berlin",
                country: "Germany",
                coords: [52.516, 13.378],
                wiki_url: "https://en.wikipedia.org/wiki/Berlin_Wall"
            }}
            guessCoords={[52.51, 13.39]}
            guessYear={1989}
            lastEntry={{ score: 1987 }}
            retryCount={2}
            accepted={true}
            revealMap={false}
            showFullCaption={false}
            setShowFullCaption={() => {}}
            onRetry={() => alert("Retry clicked")}
            onAccept={() => alert("Accept clicked")}
            onRevealMap={() => alert("Reveal map")}
            onPlayNext={() => alert("Play next")}
            onFinishSession={() => alert("Finish session")}
            IconLocation={IconLocation}
            IconCalendar={IconCalendar}
            IconTrophy={IconTrophy}
            />
      )}
    </div>
  );
}