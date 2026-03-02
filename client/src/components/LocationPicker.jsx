// src/components/LocationPicker.jsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { TextField, InputAdornment, IconButton, Button } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { API_URL } from '../utils/api';

// Fix default icon paths (bundler quirk)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Child component to handle map clicks
function ClickSelector({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function PanToLocation({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  return null;
}

export default function LocationPicker({ value, onChange }) {
  // Fallback starting center (e.g., your main city)
  const defaultCenter = [26.119171, -80.137212];
  const center = value || defaultCenter;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapActive, setMapActive] = useState(false);

  async function handleAddressSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
        const res = await fetch(`${API_URL}/geocoding/search?q=${encodeURIComponent(query)}`);
        // console.log('Geocoding res:', res);
        const data = await res.json();
        if (!data.lat || !data.lon) {
          alert('No results found for that address.');
          return;
        }
    
        const newCenter = [parseFloat(data.lat), parseFloat(data.lon)];
        onChange(newCenter);
      } catch (err) {
        console.error(err);
        alert('Error looking up that address.');
      } finally {
        setLoading(false);
      }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Address Search */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <TextField
            placeholder="Search address / city / landmark"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            variant="outlined"
            style={{ flex: 1 }}
            slotProps={{
                input: {
                    endAdornment: query && (
                        <InputAdornment position="end">
                        <IconButton
                            onClick={() => setQuery('')}
                            edge="end"
                        >
                            <ClearIcon />
                        </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
        />
        <Button
          type="button"
          variant="outlined"
          onClick={handleAddressSearch}
          disabled={loading}
        >
          {loading ? 'Searching…' : 'Search'}
        </Button>
    </div>

      {/* Current coords display */}
    <div style={{ fontSize: '0.85rem', color: '#555' }}>
        Selected location:&nbsp;
        {center[0].toFixed(5)}, {center[1].toFixed(5)}
    </div>

    {/* Map with marker + circle */}
    <div style={{ position: 'relative', width: '100%', height: '350px' }}>
      {!mapActive && (
        <div
          onClick={() => setMapActive(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '16px 20px',
              borderRadius: 10,
              textAlign: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Tap to set location</div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>Click to unlock map interaction</div>
          </div>
        </div>
      )}

      {mapActive && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
          }}
        >
          <Button
            type="button"
            variant="contained"
            size="small"
            onClick={() => setMapActive(false)}
            sx={{ bgcolor: 'white', color: 'text.primary', '&:hover': { bgcolor: 'grey.100' } }}
          >
            🔒 Lock Map
          </Button>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={mapActive}
        dragging={mapActive}
        style={{ width: '100%', height: '350px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={center} />
        <Circle
          center={center}
          radius={150} // in meters
          pathOptions={{
            color: '#222222',
            weight: 1,
            fillColor: '#cc7755',
            fillOpacity: 0.35,
          }}
        />
        <PanToLocation center={center} />
        {mapActive && <ClickSelector onSelect={onChange} />}
      </MapContainer>
    </div>
    </div>
  );
}
