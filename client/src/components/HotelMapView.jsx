import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Button, List, ListItem, ListItemText } from '@mui/material';
import L from 'leaflet';

// Fix default icon issue with bundlers (Vite, CRA, etc.)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to handle map updates when center changes
function MapUpdater({ center }) {
  const map = useMapEvents({});
  
  React.useEffect(() => {
    if (map && center) {
      map.flyTo([center.lat, center.lng], 13, {
        duration: 1.5,
      });
    }
  }, [map, center]);

  return null;
}

// Custom icon for cluster markers
const createClusterIcon = (count) => {
  const html = `
    <div style="
      background-color: #FF6B6B;
      color: white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      ${count}
    </div>
  `;
  return L.divIcon({
    html,
    iconSize: [40, 40],
    className: 'cluster-icon',
  });
};

// Custom icon for single markers
const createMarkerIcon = () => {
  return L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

export default function MapView({
  properties = [],
  groupedMarkers = [],
  center = { lat: 25.7617, lng: -80.1918 },
  radius = 30,
  onPropertyClick = () => {},
}) {
  const [expandedCluster, setExpandedCluster] = useState(null);

  const mapCenter = [center.lat, center.lng];
  const radiusMeters = radius * 1609.34; // Convert miles to meters

  // Helper function to generate random offset within 150m radius
  const getObfuscatedPosition = (property, index) => {
    // Use property ID and index to create a deterministic but seemingly random offset
    const seed = (property._id.charCodeAt(0) + index) % 360;
    const angleDegrees = seed; // Angle in degrees (0-360)
    const distance = 50 + ((property._id.charCodeAt(1) || 0) % 100); // 50-150 meters

    const radians = (angleDegrees * Math.PI) / 180;
    const latOffset = (distance * Math.cos(radians)) / 111000; // 111km per degree latitude
    const lngOffset = (distance * Math.sin(radians)) / (111000 * Math.cos((center.lat * Math.PI) / 180));

    return [
      property.latitude + latOffset,
      property.longitude + lngOffset,
    ];
  };

  console.log('MapView render:', {
    properties: properties.length,
    groupedMarkers: groupedMarkers.length,
    center,
    radius
  });

  return (
    <MapContainer
      center={mapCenter}
      zoom={13}
      scrollWheelZoom={true}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <MapUpdater center={center} />

      {/* Semi-transparent search radius circle */}
      <Circle
        center={mapCenter}
        radius={radiusMeters}
        pathOptions={{
          fillColor: '#4A90E2',
          fillOpacity: 0.1,
          color: '#4A90E2',
          weight: 2,
          dashArray: '5, 5',
        }}
      />

      {/* Render grouped markers */}
      {groupedMarkers && groupedMarkers.length > 0 ? (
        groupedMarkers.map((group, groupIdx) => {
          if (!group || group.length === 0) return null;
          
          if (group.length === 1) {
            // Single property - show basic info
            const prop = group[0];
            if (!prop.latitude || !prop.longitude) {
              console.warn('Property missing coordinates:', prop._id);
              return null;
            }
            const position = getObfuscatedPosition(prop, 0);

            return (
              <Marker
                key={`single-${prop._id}`}
                position={position}
                icon={createMarkerIcon()}
              >
                <Popup closeButton={true}>
                  <Box sx={{ minWidth: '220px' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {prop.title}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                      {prop.address}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#2E7D32', mb: 1 }}>
                      ${prop.pricePerNight}/night
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                      {prop.category} • {prop.type}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      onClick={() => onPropertyClick(prop._id)}
                      sx={{ mt: 1 }}
                    >
                      View Details
                    </Button>
                  </Box>
                </Popup>
              </Marker>
            );
          } else {
            // Multiple properties in cluster - show cluster count
            const clusterCenter = group[0]; // Use first property's location as cluster center
            if (!clusterCenter.latitude || !clusterCenter.longitude) {
              console.warn('Cluster center missing coordinates:', clusterCenter._id);
              return null;
            }
            const position = getObfuscatedPosition(clusterCenter, groupIdx);

            return (
              <Marker
                key={`cluster-${groupIdx}`}
                position={position}
                icon={createClusterIcon(group.length)}
              >
                <Popup closeButton={true}>
                  <Box sx={{ minWidth: '280px', maxHeight: '400px', overflowY: 'auto' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      {group.length} properties in this area
                    </Typography>
                    <List sx={{ p: 0 }}>
                      {group.map((prop, idx) => (
                        <ListItem
                          key={prop._id}
                          sx={{
                            p: 1,
                            mb: 1,
                            bgcolor: '#f5f5f5',
                            borderRadius: '4px',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                          }}
                        >
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {prop.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                              {prop.address}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: '#2E7D32', mb: 0.5 }}
                            >
                              ${prop.pricePerNight}/night
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                              {prop.category} • {prop.type}
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => onPropertyClick(prop._id)}
                              sx={{ mt: 0.5, width: '100%' }}
                            >
                              View
                            </Button>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Popup>
              </Marker>
            );
          }
        })
      ) : (
        <Box />
      )}
    </MapContainer>
  );
}
