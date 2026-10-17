import { useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';

const DEFAULT_CENTER = [9.9312, 76.2673];
const TILE_URL = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

function MapFocus({ center }) {
  const map = useMap();
  const latitude = center?.[0];
  const longitude = center?.[1];
  useEffect(() => { if (latitude !== undefined && longitude !== undefined) map.flyTo([latitude, longitude], 15, { duration: 1 }); }, [latitude, longitude, map]);
  return null;
}

export default function TerritoryMap({ territories = [], points = [], center, userId, height = '100%' }) {
  const route = points.map((point) => [point.lat, point.lng]);
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
          return <Rectangle key={cell.key} bounds={cell.bounds} pathOptions={{
            color, weight: contested ? 2.4 : 1.5, fillColor: color, fillOpacity: 0.46,
            dashArray: contested ? '5 4' : undefined,
          }}><Tooltip direction="top" sticky>{isMine ? 'Your territory' : `${cell.owner?.name || 'Runner'}’s territory`}{contested ? ` · challenged by ${cell.challenger.name}` : ''}</Tooltip></Rectangle>;
        })}
        {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#f3a56e', weight: 5, opacity: 0.95 }} />}
        {route.length > 0 && <CircleMarker center={route.at(-1)} radius={8} pathOptions={{
          color: '#fff', weight: 3, fillColor: '#f28d59', fillOpacity: 1,
        }} />}
        <MapFocus center={center} />
      </MapContainer>
    </div>
  );
}
