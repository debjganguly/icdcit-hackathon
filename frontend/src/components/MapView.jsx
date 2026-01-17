import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// IMPORTANT: Replace with your Mapbox token
// Get free token at: https://account.mapbox.com/
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const MapView = ({ data, onPointClick, selectedZone, showHeatmap }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [85.82, 20.30], // Bhubaneswar
      zoom: 11,
      pitch: 45,
      bearing: 0
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add scale control
    map.current.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }),
      'bottom-left'
    );

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add 3D buildings layer
      map.current.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapLoaded || !data || !map.current) return;

    // Remove existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Filter data based on selected zone
    const filteredData = selectedZone === 'all'
      ? data
      : data.filter(point => point.zone === selectedZone);

    // Add new markers
    filteredData.forEach((point, index) => {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';

      // Size based on UHI intensity
      const size = Math.max(12, Math.min(24, 12 + Math.abs(point.uhi_intensity) * 2));

      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundColor = point.color;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.transition = 'transform 0.2s';

      // Hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Create popup content
      const popupContent = `
        <div style="font-family: Arial, sans-serif; min-width: 250px;">
          <div style="background: linear-gradient(135deg, ${point.color} 0%, ${point.color}dd 100%); 
                      color: white; padding: 12px; margin: -10px -10px 10px -10px; 
                      border-radius: 3px 3px 0 0;">
            <h3 style="margin: 0; font-size: 16px; font-weight: bold;">
              ${point.severity} Heat Zone
            </h3>
          </div>
          
          <div style="padding: 0 4px;">
            <div style="margin-bottom: 10px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">🌡️ Temperature</div>
              <div style="font-size: 20px; font-weight: bold; color: #333;">
                ${point.lst.toFixed(1)}°C
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <div>
                <div style="font-size: 11px; color: #666;">🌿 NDVI</div>
                <div style="font-size: 14px; font-weight: bold; color: #22c55e;">
                  ${point.ndvi.toFixed(3)}
                </div>
              </div>
              <div>
                <div style="font-size: 11px; color: #666;">🔥 UHI Intensity</div>
                <div style="font-size: 14px; font-weight: bold; color: ${point.uhi_intensity > 0 ? '#ef4444' : '#3b82f6'};">
                  ${point.uhi_intensity > 0 ? '+' : ''}${point.uhi_intensity.toFixed(1)}°C
                </div>
              </div>
            </div>
            
            <div style="margin-bottom: 10px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">🌳 Vegetation</div>
              <div style="font-size: 13px; color: #333;">
                ${point.vegetation}
              </div>
            </div>
            
            <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin-top: 10px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: bold;">
                💡 Recommendation
              </div>
              <div style="font-size: 12px; color: #374151; line-height: 1.4;">
                ${point.recommendation}
              </div>
            </div>
            
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 10px; color: #9ca3af;">
                Priority: ${point.priority} | Zone: ${point.zone} | 
                Coordinates: ${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px'
      }).setHTML(popupContent);

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([point.lon, point.lat])
        .setPopup(popup)
        .addTo(map.current);

      // Add click handler
      el.addEventListener('click', () => {
        if (onPointClick) {
          onPointClick(point);
        }
      });

      markers.current.push(marker);
    });

    // Fit bounds to show all markers
    if (filteredData.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredData.forEach(point => {
        bounds.extend([point.lon, point.lat]);
      });
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 14,
        duration: 1000
      });
    }

  }, [data, mapLoaded, selectedZone, onPointClick]);

  // Add heatmap layer
  useEffect(() => {
    if (!mapLoaded || !data || !map.current || !showHeatmap) return;

    const heatmapId = 'heatmap-layer';

    // Remove existing heatmap
    if (map.current.getLayer(heatmapId)) {
      map.current.removeLayer(heatmapId);
    }
    if (map.current.getSource(heatmapId)) {
      map.current.removeSource(heatmapId);
    }

    // Create GeoJSON from data
    const geojson = {
      type: 'FeatureCollection',
      features: data.map(point => ({
        type: 'Feature',
        properties: {
          temperature: point.lst,
          intensity: Math.abs(point.uhi_intensity)
        },
        geometry: {
          type: 'Point',
          coordinates: [point.lon, point.lat]
        }
      }))
    };

    // Add heatmap source
    map.current.addSource(heatmapId, {
      type: 'geojson',
      data: geojson
    });

    // Add heatmap layer
    map.current.addLayer({
      id: heatmapId,
      type: 'heatmap',
      source: heatmapId,
      maxzoom: 15,
      paint: {
        // Increase weight based on temperature
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'temperature'],
          25, 0,
          45, 1
        ],
        // Increase intensity as zoom level increases
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        // Color ramp for heatmap
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        // Adjust radius by zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          15, 20
        ],
        // Transition from heatmap to circle layer
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          15, 0
        ]
      }
    }, 'waterway-label');

  }, [data, mapLoaded, showHeatmap]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          fontSize: '18px',
          borderRadius: '12px'
        }}>
          <div>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }}></div>
            Loading Map...
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default MapView;