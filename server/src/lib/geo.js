export const CELL_METERS = 150;
const EARTH_RADIUS = 6371000;
const WEB_MERCATOR_RADIUS = 6378137;

export function distanceMeters(a, b) {
  const toRadians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRadians;
  const dLng = (b.lng - a.lng) * toRadians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRadians) *
    Math.cos(b.lat * toRadians) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pointToCell({ lat, lng }) {
  const boundedLat = Math.max(-85, Math.min(85, lat));
  const mx = WEB_MERCATOR_RADIUS * lng * Math.PI / 180;
  const my = WEB_MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + boundedLat * Math.PI / 360));
  const x = Math.floor(mx / CELL_METERS);
  const y = Math.floor(my / CELL_METERS);
  return { key: `${x}:${y}`, x, y };
}

export function cellBounds(x, y) {
  const toLatLng = (mx, my) => [
    (2 * Math.atan(Math.exp(my / WEB_MERCATOR_RADIUS)) - Math.PI / 2) * 180 / Math.PI,
    mx / WEB_MERCATOR_RADIUS * 180 / Math.PI,
  ];
  return [
    toLatLng(x * CELL_METERS, y * CELL_METERS),
    toLatLng((x + 1) * CELL_METERS, (y + 1) * CELL_METERS),
  ];
}

function coarseMarker(point) {
  const x = WEB_MERCATOR_RADIUS * point.lng * Math.PI / 180;
  const y = WEB_MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + point.lat * Math.PI / 360));
  const snap = (meters) => Math.floor(meters / 25) * 25 + 12.5;
  return {
    lat: (2 * Math.atan(Math.exp(snap(y) / WEB_MERCATOR_RADIUS)) - Math.PI / 2) * 180 / Math.PI,
    lng: snap(x) / WEB_MERCATOR_RADIUS * 180 / Math.PI,
  };
}

export function routeCells(points) {
  const travelByCell = new Map();
  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1];
    const end = points[i];
    const segment = distanceMeters(start, end);
    // Score the measured locations, not the straight line between them. A sparse
    // GPS segment may cross a river even when the runner took a nearby bridge.
    for (const point of [start, end]) {
      const cell = pointToCell(point);
      const marker = coarseMarker(point);
      const previous = travelByCell.get(cell.key);
      travelByCell.set(cell.key, {
        ...cell,
        meters: (previous?.meters || 0) + segment / 2,
        lat: marker.lat,
        lng: marker.lng,
      });
    }
  }
  return [...travelByCell.values()].filter((cell) => cell.meters >= 35).slice(0, 30);
}

export function validateRun(rawPoints, now = Date.now()) {
  if (!Array.isArray(rawPoints) || rawPoints.length < 5 || rawPoints.length > 2000) {
    throw new Error('A run needs between 5 and 2,000 location samples.');
  }
  const points = rawPoints.map((point) => ({
    lat: Number(point.lat), lng: Number(point.lng),
    accuracy: Number(point.accuracy), timestamp: Number(point.timestamp),
  }));
  for (const point of points) {
    if (!Number.isFinite(point.lat) || Math.abs(point.lat) > 85 ||
      !Number.isFinite(point.lng) || Math.abs(point.lng) > 180 ||
      !Number.isFinite(point.accuracy) || point.accuracy < 0 ||
      !Number.isFinite(point.timestamp) || point.timestamp > now + 60_000) {
      throw new Error('The run contains invalid location data.');
    }
  }
  if (points.some((point, i) => i > 0 && point.timestamp <= points[i - 1].timestamp)) {
    throw new Error('Location samples must be in time order.');
  }
  const durationSeconds = (points.at(-1).timestamp - points[0].timestamp) / 1000;
  if (durationSeconds < 480 || durationSeconds > 10800) {
    throw new Error('A qualifying run must last 8 minutes to 3 hours.');
  }
  if (points[0].timestamp < now - 10800_000 - 120_000) {
    throw new Error('Please submit a run soon after finishing it.');
  }
  const accurate = points.filter((point) => point.accuracy <= 50);
  if (accurate.length < 5 || accurate.length < points.length * 0.75) {
    throw new Error('GPS accuracy was too low for this run.');
  }
  let distance = 0;
  let suspicious = 0;
  const clean = [accurate[0]];
  for (let i = 1; i < accurate.length; i += 1) {
    const previous = clean.at(-1);
    const current = accurate[i];
    const seconds = (current.timestamp - previous.timestamp) / 1000;
    const segment = distanceMeters(previous, current);
    if (seconds <= 0 || seconds > 180 || segment / seconds > 7.5) {
      suspicious += 1;
      continue;
    }
    distance += segment;
    clean.push(current);
  }
  if (suspicious > Math.max(2, Math.floor(accurate.length * 0.15))) {
    throw new Error('Too many GPS jumps were detected.');
  }
  if (distance < 1000 || clean.length < 5) {
    throw new Error('A qualifying run must cover at least 1 km.');
  }
  return { points: clean, distanceMeters: Math.round(distance), durationSeconds: Math.round(durationSeconds) };
}
