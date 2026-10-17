import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';

const DEFAULT_CENTER = [9.978, 76.289];
const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function MapFocus({ center }) {
  const map = useMap();
  const latitude = center?.[0];
  const longitude = center?.[1];
  useEffect(() => { if (latitude !== undefined && longitude !== undefined) map.flyTo([latitude, longitude], 15, { duration: 1 }); }, [latitude, longitude, map]);
  return null;
}

export default function TerritoryMap({ territories = [], points = [], center, userId, height = '100%' }) {
  const route = points.filter((point) => point.accuracy <= 50);
  const routeSegments = [];
  for (const point of route) {
    const previous = routeSegments.at(-1)?.at(-1);
    if (!previous || point.timestamp - previous.timestamp > 30_000 || distanceBetween(previous, point) > 45) {
      routeSegments.push([point]);
    } else {
      routeSegments.at(-1).push(point);
    }
  }
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer center={DEFAULT_CENTER} zoom={14} scrollWheelZoom={false} className="territory-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={TILE_URL}
          maxZoom={19}
        />
        {territories.map((cell) => {
          const isMine = userId && cell.owner?.id === userId;
          const contested = cell.challenger && new Date(cell.challengeExpiresAt) > new Date();
          const color = contested ? '#e9a84c' : isMine ? '#79bd71' : '#375f79';
          const marker = cell.marker || [
            (cell.bounds[0][0] + cell.bounds[1][0]) / 2,
            (cell.bounds[0][1] + cell.bounds[1][1]) / 2,
          ];
          return <CircleMarker key={cell.key} center={marker} radius={contested ? 12 : 10} pathOptions={{
            color: '#fff', weight: 2.5, fillColor: color, fillOpacity: 0.92,
            className: 'territory-marker',
          }}><Tooltip direction="top" sticky>{isMine ? 'Your territory' : `${cell.owner?.name || 'Runner'}’s territory`}{contested ? ` · challenged by ${cell.challenger.name}` : ''}</Tooltip></CircleMarker>;
        })}
        {routeSegments.filter((segment) => segment.length > 1).map((segment, index) => <Polyline key={index} positions={segment.map((point) => [point.lat, point.lng])} pathOptions={{ color: '#f3a56e', weight: 5, opacity: 0.95 }} />)}
        {route.length > 0 && <CircleMarker center={[route.at(-1).lat, route.at(-1).lng]} radius={8} pathOptions={{
          color: '#fff', weight: 3, fillColor: '#f28d59', fillOpacity: 1,
        }} />}
        <MapFocus center={center} />
      </MapContainer>
    </div>
  );
}

function distanceBetween(a, b) {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
