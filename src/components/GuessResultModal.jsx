import MapboxMap from "./MapboxMap";
import { useState } from 'react';
import supabase from "../supabaseClient";

export default function GuessResultModal({
    event,
    guessCoords,
    guessYear,
    lastEntry,
    retryCount,
    accepted,
    revealMap,
    showFullCaption,
    setShowFullCaption,
    onRetry,
    onAccept,
    onRevealMap,
    playerName,
    onPlayNext,
    onFinishSession,
    onConfirmLastEvent = () => {},
    onEarlyExit,
    IconLocation,
    IconCalendar,
    IconTrophy,
    isLastRound
}) {
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

const [showFeedbackModal, setShowFeedbackModal] = useState(false);
const [feedbackText, setFeedbackText] = useState("");

const handleFeedbackSubmit = async () => {
  if (!feedbackText.trim()) {
    alert("Please enter feedback before submitting.");
    return;
  }

  const distance = getDistance(...guessCoords, ...event.coords);
  const yearDiff = Math.abs(event.year - parseInt(guessYear));

  const { error } = await supabase.from("feedback").insert([
    {
      feedback: feedbackText.trim(),
      event_slug: event.slug,
      result_id: lastEntry?.id ?? null,
      score: lastEntry?.score ?? null,
      distance_km: distance,
      year_diff: yearDiff,
      retry_count: retryCount,
      player_name: playerName || null,
    },
  ]);

  if (error) {
    console.error("❌ Feedback error:", error.message);
    alert("There was a problem submitting your feedback.");
  } else {
    console.log("✅ Feedback submitted.");
    setShowFeedbackModal(false);
    setFeedbackText("");
  }
};

return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
    <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg text-left space-y-4 z-[101]">
      {isLastRound && (
        <div className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded w-fit mx-auto mb-2 uppercase tracking-wide">
          Final Event!
        </div>
      )}

      <h2 className="text-xl font-semibold">Your Guess for {event.title.replace(/^the\s+/i, '')}</h2>

      <p className="flex items-center text-sm">
        <IconLocation />
        <span>Distance:</span>&nbsp;
        {getDistance(...guessCoords, ...event.coords).toFixed(1)} km away
      </p>

      <p className="flex items-center text-sm">
        <IconCalendar />
        <span>Year Difference:</span>&nbsp;
        {Math.abs(event.year - parseInt(guessYear)) === 0
          ? "Perfect Match!"
          : `${Math.abs(event.year - parseInt(guessYear))} year(s)`}
      </p>

      <p className="flex items-center text-sm">
        <IconTrophy />
        <span>Score:</span>&nbsp;
        {lastEntry?.score} points
      </p>

      <p>
        <span className="font-medium">Attempt:</span> {retryCount + 1} of 3 tries
      </p>

      <hr className="my-2 border-gray-200" />

      {(retryCount >= 2 || accepted) && (
        <>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Location:</span>{" "}
            {[event.notable_location, event.city, event.country].filter(Boolean).join(", ")}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Year:</span>{" "}
            {event.year < 0 ? `${-event.year} BCE` : `${event.year} CE`}
          </p>

          {event.caption && (
            <p className="text-sm italic mt-2 text-gray-700">
              {showFullCaption || event.caption.length <= 300
                ? event.caption
                : `${event.caption.slice(0, 300).trim()}…`}
              {event.caption.length > 300 && (
                <button
                  onClick={() => setShowFullCaption(!showFullCaption)}
                  className="text-blue-600 ml-1 hover:underline text-xs"
                >
                  {showFullCaption ? "Show less" : "Read more"}
                </button>
              )}
            </p>
          )}

          <div className="flex justify-between items-center mt-2 text-sm">
            {event.wiki_url && (
              <a
                href={event.wiki_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" className="w-4 h-4 mr-1" fill="currentColor">
                  <path d="M640 48c0-8.8-7.2-16-16-16H16C7.2 32 0 39.2 0 48v16c0 8.8 7.2 16 16 16h100.1l141 318.6c2.2 5.1 8.4 7.7 13.6 5.4l13.9-6.2c5.1-2.2 7.7-8.4 5.4-13.6L163.2 80h93.6l85.3 192.6L428.6 80h93.6L374 374.2c-2.2 5.1.3 11.1 5.4 13.3l13.9 6.2c5.1 2.2 11.1-.3 13.3-5.4l141-318.3H624c8.8 0 16-7.2 16-16V48z"/>
                </svg>
                Learn more on Wikipedia
              </a>
            )}

            {accepted && (
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="text-blue-600 hover:underline text-sm"
              >
                ❓ Something wrong?
              </button>
            )}
          </div>

          {accepted && (
            <div className="mt-4 rounded overflow-hidden shadow border border-gray-200">
              <MapboxMap
                guessCoords={guessCoords}
                actualCoords={event.coords}
                isResult
              />
            </div>
          )}
        </>
      )}

      {/* Button group */}
      <div className="flex justify-center gap-3 mt-6">
        {!accepted && retryCount < 2 && (
          <button
            onClick={onRetry}
            className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium w-40 h-10 flex items-center justify-center text-sm rounded shadow-sm transition"
          >
            ⟲ Retry Guess
          </button>
        )}

        {!accepted && (
          <button
            onClick={onAccept}
            className="bg-green-600 hover:bg-green-700 text-white font-medium w-40 h-10 flex items-center justify-center text-sm rounded shadow-sm transition"
          >
            ✓ Accept Result
          </button>
        )}

        {accepted && (
          <>
            {!isLastRound && (
              <button
                onClick={onPlayNext}
                className="bg-green-100 hover:bg-green-200 text-green-900 font-medium w-40 h-10 flex items-center justify-center text-sm rounded shadow-sm transition"
              >
                → Play Next Event
              </button>
            )}
            {isLastRound && (
              <button
                onClick={onConfirmLastEvent}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium w-40 h-10 flex items-center justify-center text-sm rounded shadow-sm transition"
              >
                → See Final Summary
              </button>
            )}
            <button
              onClick={onEarlyExit}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium w-40 h-10 flex items-center justify-center text-sm rounded shadow-sm transition"
            >
              ⏹️ End Session Early
            </button>
          </>
        )}
      </div>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[150]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg space-y-4 relative">
            <h3 className="text-lg font-semibold">Send Feedback</h3>

            <label className="block text-sm font-medium text-gray-700">Tell us what needs fixing about this event</label>
            <select
              value={feedbackText.startsWith("📝 Other") ? "📝 Other" : feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1"
            >
              <option value="">-- Select a reason --</option>
              <option value="❌ Incorrect year">❌ Incorrect year</option>
              <option value="📍 Incorrect location">📍 Incorrect location</option>
              <option value="🖼️ Misleading image">🖼️ Misleading image</option>
              <option value="🏷️ Wrong theme or metadata">🏷️ Wrong theme or metadata</option>
              <option value="📝 Other">📝 Other</option>
            </select>

            {feedbackText === "📝 Other" || feedbackText.startsWith("📝 Other\n") ? (
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mt-3"
                placeholder="Tell us more..."
                onChange={(e) =>
                  setFeedbackText(`📝 Other\n${e.target.value}`)
                }
              />
            ) : null}

            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}