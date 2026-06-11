"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ref, onValue } from "firebase/database";
import { db } from "../app/firebase";

import "leaflet/dist/leaflet.css";

type Parada = {
  nome: string;
  coords: [number, number];
};

type Props = {
  origem: [number, number];
  paradas: Parada[];
};

export default function MapComponent({ origem, paradas }: Props) {
  const [localizacaoOnibus, setLocalizacaoOnibus] = useState<
    [number, number] | null
  >(null);

  useEffect(() => {
    const onibusRef = ref(db, "onibus");

    const unsubscribe = onValue(onibusRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) return;

      setLocalizacaoOnibus([
        data.lat,
        data.lng,
      ]);
    });

    return () => unsubscribe();
  }, []);

  return (
    <MapContainer
      center={origem}
      zoom={13}
      style={{
        height: "500px",
        width: "100%",
      }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {paradas.map((p, i) => (
        <Marker key={i} position={p.coords}>
          <Popup>{p.nome}</Popup>
        </Marker>
      ))}

      {localizacaoOnibus && (
        <Marker position={localizacaoOnibus}>
          <Popup>🚌 Ônibus em tempo real</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}