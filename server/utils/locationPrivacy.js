const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

const clampLatitude = (latitude) => Math.max(-90, Math.min(90, latitude));
const normalizeLongitude = (longitude) => {
  const shifted = ((longitude + 180) % 360 + 360) % 360;
  return shifted - 180;
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

// Privacy jitter keeps approximate location while avoiding exact coordinates.
const jitterCoordinates = ({ latitude, longitude, minMeters = 25, maxMeters = 120 }) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { latitude, longitude, applied: false };
  }

  const distanceMeters = randomBetween(minMeters, maxMeters);
  const bearingRadians = randomBetween(0, Math.PI * 2);

  const lat1 = toRadians(latitude);
  const lng1 = toRadians(longitude);
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngularDistance = Math.sin(angularDistance);
  const cosAngularDistance = Math.cos(angularDistance);

  const lat2 = Math.asin(
    sinLat1 * cosAngularDistance +
    cosLat1 * sinAngularDistance * Math.cos(bearingRadians)
  );

  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRadians) * sinAngularDistance * cosLat1,
    cosAngularDistance - sinLat1 * Math.sin(lat2)
  );

  return {
    latitude: clampLatitude(toDegrees(lat2)),
    longitude: normalizeLongitude(toDegrees(lng2)),
    applied: true,
    offsetMeters: Math.round(distanceMeters),
  };
};

module.exports = {
  jitterCoordinates,
};
