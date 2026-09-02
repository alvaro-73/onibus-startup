"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ícone padrão do Leaflet
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Ícone do ônibus
const onibusIcon = L.divIcon({
  className: "fluxbus-onibus-icon",
  html: `
    <div
      style="
        background:#2563eb;
        color:#fff;
        border:2px solid #fff;
        border-radius:9999px;
        width:28px;
        height:28px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:12px;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
      "
    >
      B
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

type Parada = {
  nome: string;
  coords: [number, number];
};

type Props = {
  origem: [number, number];
  paradas: Parada[];
  onibusPosicao?: [number, number] | null;
};

function Recenter({ pos }: { pos: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(pos);
  }, [pos, map]);

  return null;
}

export default function MapComponent({
  origem,
  paradas,
  onibusPosicao,
}: Props) {
  const [rotaRuas, setRotaRuas] = useState<[number, number][]>([]);
  const [erroRota, setErroRota] = useState<string | null>(null);

  /*
   * Calcula a rota FIXA pelas ruas.
   *
   * IMPORTANTE:
   * A origem aqui é a origem da linha,
   * NÃO a posição atual do ônibus.
   */
  useEffect(() => {
    async function buscarRota() {
      if (!origem || paradas.length === 0) {
        setRotaRuas([]);
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;

      if (!apiKey) {
        setErroRota(
          "Chave do OpenRouteService não configurada."
        );
        return;
      }

      try {
        setErroRota(null);

        // Origem + todas as paradas na ordem definida
        const pontos = [
          origem,
          ...paradas.map((parada) => parada.coords),
        ];

        /*
         * OpenRouteService espera:
         * [longitude, latitude]
         */
        const coordinates = pontos.map(([lat, lng]) => [
          lng,
          lat,
        ]);

        const response = await fetch(
          "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
          {
            method: "POST",
            headers: {
              Authorization: apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              coordinates,
            }),
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data?.features ||
          data.features.length === 0
        ) {
          console.error("Resposta do ORS:", data);
          throw new Error(
            "Não foi possível encontrar o trajeto pelas ruas."
          );
        }

        /*
         * GeoJSON retorna:
         * [longitude, latitude]
         *
         * Leaflet usa:
         * [latitude, longitude]
         */
        const geometry = data.features[0].geometry;

        const coordenadas: [number, number][] =
          geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );

        setRotaRuas(coordenadas);
      } catch (error) {
        console.error("Erro ao calcular rota:", error);

        setErroRota(
          error instanceof Error
            ? error.message
            : "Erro ao calcular rota."
        );

        setRotaRuas([]);
      }
    }

    buscarRota();
  }, [origem, paradas]);

  return (
    <div>
      {erroRota && (
        <div
          style={{
            marginBottom: 10,
            padding: 10,
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: 8,
          }}
        >
          {erroRota}
        </div>
      )}

      <MapContainer
        center={origem}
        zoom={14}
        style={{
          height: "500px",
          width: "100%",
          borderRadius: 12,
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ROTA PELAS RUAS */}
        {rotaRuas.length > 0 && (
          <Polyline
            positions={rotaRuas}
            pathOptions={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.8,
            }}
          />
        )}

        {/* PARADAS */}
        {paradas.map((parada, i) => (
          <Marker
            key={`${parada.nome}-${i}`}
            position={parada.coords}
            icon={defaultIcon}
          >
            <Popup>
              {i + 1}. {parada.nome}
            </Popup>
          </Marker>
        ))}

        {/* ÔNIBUS EM TEMPO REAL */}
        {onibusPosicao && (
          <Marker
            position={onibusPosicao}
            icon={onibusIcon}
          >
            <Popup>
              🚌 Ônibus em tempo real
            </Popup>
          </Marker>
        )}

        <Recenter pos={onibusPosicao ?? origem} />
      </MapContainer>
    </div>
  );
}