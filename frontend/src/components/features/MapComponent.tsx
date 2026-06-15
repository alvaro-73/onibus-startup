"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { ref, onValue } from "firebase/database";
import { getFirebaseDb } from "@/lib/firebase";

import "leaflet/dist/leaflet.css";

type Parada = { nome: string; coords: [number, number] };

type Props = {
  origem: [number, number];
  paradas: Parada[];
  rotaId: string;
};

export default function MapComponent({ origem, paradas, rotaId }: Props) {
  const [onibus, setOnibus] = useState<[number, number] | null>(null);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    const r = ref(db, `onibus/${rotaId}`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val();
      if (data?.lat && data?.lng) {
        setOnibus([data.lat, data.lng]);
      }
    });
    return () => unsub();
  }, [rotaId]);

  const polyline: [number, number][] = [origem, ...paradas.map((p) => p.coords)];

  return (
    <MapContainer
      center={origem}
      zoom={14}
      style={{ height: 480, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={polyline} pathOptions={{ color: "#16a34a", weight: 4 }} />
      {paradas.map((p, i) => (
        <Marker key={i} position={p.coords}>
          <Popup>{p.nome}</Popup>
        </Marker>
      ))}
      {onibus && (
        <Marker position={onibus}>
          <Popup>Ônibus em tempo real</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
