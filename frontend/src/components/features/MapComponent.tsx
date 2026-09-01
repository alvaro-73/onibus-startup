"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths in bundled environments
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const onibusIcon = L.divIcon({
  className: "fluxbus-onibus-icon",
  html: '<div style="background:#2563eb;color:#fff;border:2px solid #fff;border-radius:9999px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.3)">B</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

type Parada = { nome: string; coords: [number, number] };
type Props = { origem: [number, number]; paradas: Parada[] };

function Recenter({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos);
  }, [pos, map]);
  return null;
}

export default function MapComponent({ origem, paradas }: Props) {
  const polyline: [number, number][] = [origem, ...paradas.map((p) => p.coords)];
  return (
    <MapContainer center={origem} zoom={14} style={{ height: "500px", width: "100%", borderRadius: 12 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={polyline} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.7 }} />
      {paradas.map((p, i) => (
        <Marker key={i} position={p.coords} icon={defaultIcon}>
          <Popup>{p.nome}</Popup>
        </Marker>
      ))}
      <Marker position={origem} icon={onibusIcon}>
        <Popup>Onibus em tempo real</Popup>
      </Marker>
      <Recenter pos={origem} />
    </MapContainer>
  );
}
