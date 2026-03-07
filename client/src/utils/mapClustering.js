export const MAP_CLUSTER_BASE_PIXEL_RADIUS = 30;
export const MAP_CLUSTER_MIN_RADIUS_METERS = 20;
export const MAP_CLUSTER_MAX_RADIUS_METERS = 156543;

const EARTH_CIRCUMFERENCE_METERS_AT_EQUATOR_PER_PIXEL_Z0 = 156543.03392;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const calculateDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getClusterRadiusMetersAtZoom = ({
  zoom,
  latitude,
  basePixelRadius = MAP_CLUSTER_BASE_PIXEL_RADIUS,
}) => {
  const safeZoom = Number.isFinite(zoom) ? zoom : 10;
  const safeLatitude = Number.isFinite(latitude) ? latitude : 0;

  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_METERS_AT_EQUATOR_PER_PIXEL_Z0 * Math.cos(toRadians(safeLatitude))) /
    Math.pow(2, safeZoom);

  const radiusMeters = basePixelRadius * metersPerPixel;
  return Math.max(MAP_CLUSTER_MIN_RADIUS_METERS, Math.min(MAP_CLUSTER_MAX_RADIUS_METERS, radiusMeters));
};

export const groupPropertiesByDistance = (properties, clusterRadiusMeters) => {
  if (!Array.isArray(properties) || properties.length === 0) {
    return [];
  }

  const groups = [];
  const visited = new Set();

  for (let i = 0; i < properties.length; i += 1) {
    if (visited.has(i)) continue;

    const currentProperty = properties[i];
    const cluster = [currentProperty];
    visited.add(i);

    for (let j = i + 1; j < properties.length; j += 1) {
      if (visited.has(j)) continue;
      const candidateProperty = properties[j];

      const distanceMeters = calculateDistanceMeters(
        currentProperty.latitude,
        currentProperty.longitude,
        candidateProperty.latitude,
        candidateProperty.longitude
      );

      if (distanceMeters <= clusterRadiusMeters) {
        cluster.push(candidateProperty);
        visited.add(j);
      }
    }

    groups.push(cluster);
  }

  return groups;
};