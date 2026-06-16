import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Play, Square, MapPin } from 'lucide-react';

const TrackingMap = ({ delivery, onLocationUpdate, isEditable = false }) => {
  const mapContainerRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  const [simulationActive, setSimulationActive] = useState(false);
  const simInterval = useRef(null);

  // Extract coordinates, fallback to Bengaluru coordinates if not present
  const donorLat = delivery?.donor_latitude || 12.9784;
  const donorLon = delivery?.donor_longitude || 77.6408;
  const ngoLat = delivery?.ngo_latitude || 12.9756;
  const ngoLon = delivery?.ngo_longitude || 77.6012;
  const currentLat = delivery?.current_latitude || donorLat;
  const currentLon = delivery?.current_longitude || donorLon;

  // Initialize Map
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    // Clean up existing map instance if any
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }

    // Create Map
    const map = window.L.map(mapContainerRef.current).setView([donorLat, donorLon], 13);
    leafletMap.current = map;

    // Add Premium Tile Layer (OpenStreetMap Carto DB Positron)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Custom Marker Icons (using clean SVG divs)
    const donorIcon = window.L.divIcon({
      html: `<div style="background-color: #3b82f6; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 14px;">🏨</div>`,
      className: 'custom-leaflet-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const ngoIcon = window.L.divIcon({
      html: `<div style="background-color: #10b981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 14px;">🍲</div>`,
      className: 'custom-leaflet-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const driverIcon = window.L.divIcon({
      html: `<div style="background-color: #ef4444; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.4); font-size: 16px; animation: pulse 1.5s infinite;">🚗</div>`,
      className: 'custom-leaflet-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    // Add Static Markers
    const donorMarker = window.L.marker([donorLat, donorLon], { icon: donorIcon })
      .addTo(map)
      .bindPopup(`<b>Pickup Point (Donor)</b><br/>${delivery?.donation_title || 'Food Donation'}<br/>${delivery?.donor_address || ''}`);
    markersRef.current.donor = donorMarker;

    const ngoMarker = window.L.marker([ngoLat, ngoLon], { icon: ngoIcon })
      .addTo(map)
      .bindPopup(`<b>Delivery Point (NGO)</b><br/>NGO Coordinator<br/>${delivery?.ngo_address || ''}`);
    markersRef.current.ngo = ngoMarker;

    // Add Driver Marker
    const driverMarker = window.L.marker([currentLat, currentLon], { icon: driverIcon })
      .addTo(map)
      .bindPopup(`<b>Volunteer Driver</b><br/>Status: ${delivery?.tracking_status || 'In Transit'}<br/>Phone: ${delivery?.volunteer_phone || 'N/A'}`);
    markersRef.current.driver = driverMarker;

    // Draw dashed path between donor and NGO
    const pathLine = window.L.polyline([[donorLat, donorLon], [ngoLat, ngoLon]], {
      color: '#64748b',
      dashArray: '5, 8',
      weight: 3,
      opacity: 0.8
    }).addTo(map);
    polylineRef.current = pathLine;

    // Zoom map to fit both endpoints
    const bounds = window.L.latLngBounds([[donorLat, donorLon], [ngoLat, ngoLon]]);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Allow Manual Coordinates Update by Clicking Map (NGO/Volunteer view only)
    if (isEditable && onLocationUpdate) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onLocationUpdate(lat, lng);
      });
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update Driver Marker location when props change
  useEffect(() => {
    if (markersRef.current.driver && currentLat && currentLon) {
      markersRef.current.driver.setLatLng([currentLat, currentLon]);
      
      // Update popup content with latest status details
      markersRef.current.driver.getPopup().setContent(
        `<b>Volunteer Driver</b><br/>Status: ${delivery?.tracking_status?.toUpperCase() || 'IN TRANSIT'}<br/>Phone: ${delivery?.volunteer_phone || 'N/A'}`
      );
    }
  }, [currentLat, currentLon, delivery?.tracking_status]);

  // Simulation runner logic
  const startSimulation = () => {
    if (!onLocationUpdate) return;
    setSimulationActive(true);

    let progress = 0.0;
    const steps = 30; // 30 steps to get from donor to NGO

    // If driver is already at some distance, start from there
    const totalDistanceLat = ngoLat - donorLat;
    const totalDistanceLon = ngoLon - donorLon;
    const currentProgressLat = currentLat - donorLat;

    if (Math.abs(totalDistanceLat) > 0.0001) {
      progress = currentProgressLat / totalDistanceLat;
      if (progress >= 0.99 || progress < 0) progress = 0.0;
    }

    simInterval.current = setInterval(() => {
      progress += 1.0 / steps;
      if (progress >= 1.0) {
        progress = 1.0;
        clearInterval(simInterval.current);
        setSimulationActive(false);
      }

      // Linear interpolation between donor and NGO coordinates
      const nextLat = donorLat + (ngoLat - donorLat) * progress;
      const nextLon = donorLon + (ngoLon - donorLon) * progress;
      
      onLocationUpdate(nextLat, nextLon);
    }, 2000); // Step every 2 seconds
  };

  const stopSimulation = () => {
    if (simInterval.current) {
      clearInterval(simInterval.current);
    }
    setSimulationActive(false);
  };

  useEffect(() => {
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
      
      <div 
        ref={mapContainerRef} 
        style={{ 
          height: '320px', 
          width: '100%', 
          borderRadius: 'var(--radius-sm)', 
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 1
        }} 
      />

      {/* Info Panel & Simulation Actions */}
      <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
              <Navigation size={14} className="text-secondary" />
              <span>Current Coordinates:</span>
            </div>
            <code style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Lat: {currentLat.toFixed(6)}, Lon: {currentLon.toFixed(6)}
            </code>
          </div>

          {isEditable && onLocationUpdate && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!simulationActive ? (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}
                  onClick={startSimulation}
                >
                  <Play size={12} /> Simulate Route
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
                  onClick={stopSimulation}
                >
                  <Square size={12} /> Stop Sim
                </button>
              )}
            </div>
          )}
        </div>

        {isEditable && onLocationUpdate && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={12} /> <i>Tip: You can also click anywhere on the map to manually set the driver's custom location.</i>
          </p>
        )}
      </div>
    </div>
  );
};

export default TrackingMap;
