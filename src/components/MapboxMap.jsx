import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapboxMap({ 
  actualCoords, 
  guessCoords, 
  guessCoordsOnly, 
  setGuessCoords, 
  isStatic = false, 
  isResult = false, 
  event, 
  retryCenter = null, 
  retryZoom = null, 
  shouldRecenter = false, 
  onRecenterComplete = () => {} // new callback
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/vincentseris/cm9u72ite001d01s9engy9j7j',
      center: [2, 48],
      zoom: 2,
    });

    if (!actualCoords && setGuessCoords) {
      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        setGuessCoords([lat, lng]);

        if (markerRef.current) markerRef.current.remove();
        markerRef.current = new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .addTo(map.current);

          const currentZoom = map.current.getZoom();
          let targetZoom;

          if (currentZoom < 4) {
            targetZoom = 5.5; // Very far view, jump closer
          } else if (currentZoom < 6) {
            targetZoom = currentZoom + 2; // Medium view, zoom in 2 levels
          } else {
            targetZoom = Math.min(currentZoom + 1, 12); // Already close, just zoom slightly
          }
          
          map.current.flyTo({
            center: [lng, lat],
            zoom: targetZoom,
            speed: 0.7,
            curve: 1.3,
            easing: (t) => t,
            essential: true,
          });
      });
    }
  }, []);

  useEffect(() => {
    if (!map.current) return;

    const markers = document.getElementsByClassName('mapboxgl-marker');
    while (markers.length) {
      markers[0].remove();
    }

    if (isResult && actualCoords && guessCoords) {
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
    } else if (guessCoords && !isResult) {
      new mapboxgl.Marker({ color: 'red' })
        .setLngLat([guessCoords[1], guessCoords[0]])
        .addTo(map.current);

      map.current.panTo([guessCoords[1], guessCoords[0]]);
    }
  }, [guessCoords, actualCoords, isResult]);

  useEffect(() => {
    if (!map.current || !event || isResult) return;

    map.current.flyTo({
      center: [2, 48],
      zoom: 2,
    });
  }, [event]);

  // NEW: Handle Retry Recenter based on previous guess
  useEffect(() => {
    if (!map.current) return;

    if (shouldRecenter && retryCenter && retryZoom) {
      map.current.flyTo({
        center: [retryCenter[1], retryCenter[0]], // lng, lat
        zoom: retryZoom,
        speed: 0.8,
        curve: 1.5,
        easing: (t) => t, // linear easing
        essential: true,
      });
      onRecenterComplete(); // call back to parent to reset shouldRecenter
    }
  }, [shouldRecenter, retryCenter, retryZoom, onRecenterComplete]);

  return (
    <div
      ref={mapContainer}
      className="w-full aspect-[1/1] rounded shadow"
    />
  );
}