import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapboxMap({ actualCoords, guessCoords, guessCoordsOnly, setGuessCoords, isStatic = false  }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/vincentseris/cm9u72ite001d01s9engy9j7j',
      center: [2, 48], // Europe-centered default
      zoom: 3,
    });

    // Gameplay mode: click to guess
    if (!actualCoords && setGuessCoords) {
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setGuessCoords([lat, lng]);

        if (markerRef.current) markerRef.current.remove();
        markerRef.current = new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .addTo(map.current);
      });
    }
  }, []);

  useEffect(() => {
    if (!map.current || !actualCoords || !guessCoords) return;

    // Clean up any old guess markers from gameplay mode
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Results mode: show both markers
    new mapboxgl.Marker({ color: 'green' })
      .setLngLat([actualCoords[1], actualCoords[0]])
      .setPopup(new mapboxgl.Popup().setText('📍 Actual'))
      .addTo(map.current);

    new mapboxgl.Marker({ color: 'red' })
      .setLngLat([guessCoords[1], guessCoords[0]])
      .setPopup(new mapboxgl.Popup().setText('❌ Your Guess'))
      .addTo(map.current);

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([actualCoords[1], actualCoords[0]]);
    bounds.extend([guessCoords[1], guessCoords[0]]);
    map.current.fitBounds(bounds, { padding: 60 });
  }, [actualCoords, guessCoords]);

  return (
    <div
      ref={mapContainer}
      className={`w-full ${isStatic ? 'aspect-square' : 'h-64'} rounded shadow`}
    />
  );
}