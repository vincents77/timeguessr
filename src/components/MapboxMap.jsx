import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

// ✅ Your Mapbox Access Token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapboxMap({ actualCoords, guessCoords }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (map.current) return; 
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/vincentseris/cm9u72ite001d01s9engy9j7j',
      center: [51.48,0],
      zoom: 2
    });
  }, []);

  useEffect(() => {
    if (!map.current || !actualCoords || !guessCoords) return;

    // Clear existing markers
    map.current.eachLayer((layer) => {
      if (layer.type === 'symbol' || layer.type === 'circle') {
        map.current.removeLayer(layer.id);
      }
    });

    // Add Actual Marker
    new mapboxgl.Marker({ color: 'green' })
      .setLngLat([actualCoords[1], actualCoords[0]])
      .setPopup(new mapboxgl.Popup().setText('📍 Actual'))
      .addTo(map.current);

    // Add Guess Marker
    new mapboxgl.Marker({ color: 'red' })
      .setLngLat([guessCoords[1], guessCoords[0]])
      .setPopup(new mapboxgl.Popup().setText('❌ Your Guess'))
      .addTo(map.current);

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([actualCoords[1], actualCoords[0]]);
    bounds.extend([guessCoords[1], guessCoords[0]]);
    map.current.fitBounds(bounds, { padding: 60 });

  }, [actualCoords, guessCoords]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-64 rounded shadow"
    />
  );
}