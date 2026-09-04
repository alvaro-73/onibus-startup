"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type Ponto = [number, number];

type Parada = {
  nome: string;
  coords: Ponto;
};

type Props = {
  origem: Ponto;
  paradas: Parada[];
  onibusPosicao?: Ponto | null;
};

const RAIO_PARADA_METROS = 50;

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

const concluidaIcon = L.divIcon({
  className: "fluxbus-parada-concluida",
  html: `
    <div
      style="
        background:#16a34a;
        color:#fff;
        border:3px solid #fff;
        border-radius:50%;
        width:30px;
        height:30px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:16px;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
      "
    >
      ✓
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const proximaIcon = L.divIcon({
  className: "fluxbus-proxima-parada",
  html: `
    <div
      style="
        background:#2563eb;
        color:#fff;
        border:3px solid #fff;
        border-radius:50%;
        width:32px;
        height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:14px;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
      "
    >
      →
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const onibusIcon = L.divIcon({
  className: "fluxbus-onibus-icon",
  html: `
    <div
      style="
        background:#2563eb;
        color:#fff;
        border:2px solid #fff;
        border-radius:9999px;
        width:30px;
        height:30px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:13px;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
      "
    >
      🚌
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function Recenter({ pos }: { pos: Ponto }) {
  const map = useMap();

  useEffect(() => {
    map.setView(pos);
  }, [pos, map]);

  return null;
}

/*
 * Distância entre duas coordenadas em metros.
 * Usa a fórmula de Haversine.
 */
function distanciaMetros(a: Ponto, b: Ponto) {
  const R = 6371000;

  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;

  const deltaLat =
    ((b[0] - a[0]) * Math.PI) / 180;

  const deltaLng =
    ((b[1] - a[1]) * Math.PI) / 180;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(lat1) *
      Math.cos(lat2) *
      sinLng *
      sinLng;

  return (
    2 *
    R *
    Math.atan2(
      Math.sqrt(h),
      Math.sqrt(1 - h)
    )
  );
}

/*
 * Distância aproximada usada para descobrir
 * o segmento da rota mais próximo do ônibus.
 */
function distanciaQuadrada(a: Ponto, b: Ponto) {
  const lat = a[0] - b[0];
  const lng = a[1] - b[1];

  return lat * lat + lng * lng;
}

/*
 * Encontra o ponto mais próximo do ônibus
 * em um segmento da rota.
 */
function pontoMaisProximoNoSegmento(
  ponto: Ponto,
  inicio: Ponto,
  fim: Ponto
): Ponto {
  const x = ponto[1];
  const y = ponto[0];

  const x1 = inicio[1];
  const y1 = inicio[0];

  const x2 = fim[1];
  const y2 = fim[0];

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return inicio;
  }

  let t =
    ((x - x1) * dx + (y - y1) * dy) /
    (dx * dx + dy * dy);

  t = Math.max(0, Math.min(1, t));

  return [
    y1 + t * dy,
    x1 + t * dx,
  ];
}

/*
 * Descobre onde o ônibus está na rota.
 */
function encontrarPosicaoNaRota(
  rota: Ponto[],
  onibus: Ponto
) {
  let menorDistancia = Infinity;
  let melhorPonto = rota[0];
  let melhorSegmento = 0;

  for (let i = 0; i < rota.length - 1; i++) {
    const ponto = pontoMaisProximoNoSegmento(
      onibus,
      rota[i],
      rota[i + 1]
    );

    const distancia =
      distanciaQuadrada(onibus, ponto);

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhorPonto = ponto;
      melhorSegmento = i;
    }
  }

  return {
    ponto: melhorPonto,
    segmento: melhorSegmento,
  };
}

export default function MapComponent({
  origem,
  paradas,
  onibusPosicao,
}: Props) {
  const [rotaRuas, setRotaRuas] = useState<Ponto[]>([]);
  const [erroRota, setErroRota] = useState<string | null>(
    null
  );

  /*
   * Índice da próxima parada.
   *
   * 0 = primeira parada
   * 1 = segunda parada
   * 2 = terceira parada
   */
  const [proximaParada, setProximaParada] =
    useState(0);

  /*
   * Guarda o maior progresso alcançado na rota.
   */
  const maiorSegmentoPercorrido = useRef(0);

  /*
   * Calcula a rota pelas ruas usando ORS.
   */
  useEffect(() => {
    async function buscarRota() {
      if (!origem || paradas.length === 0) {
        setRotaRuas([]);
        return;
      }

      const apiKey =
        process.env.NEXT_PUBLIC_ORS_API_KEY;

      if (!apiKey) {
        setErroRota(
          "Chave do OpenRouteService não configurada."
        );
        return;
      }

      try {
        setErroRota(null);

        const pontos = [
          origem,
          ...paradas.map(
            (parada) => parada.coords
          ),
        ];

        const coordinates = pontos.map(
          ([lat, lng]) => [lng, lat]
        );

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
          console.error("Resposta ORS:", data);

          throw new Error(
            "Não foi possível encontrar a rota."
          );
        }

        const geometry =
          data.features[0].geometry;

        const rotaConvertida: Ponto[] =
          geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [
              lat,
              lng,
            ]
          );

        setRotaRuas(rotaConvertida);

        maiorSegmentoPercorrido.current = 0;
      } catch (error) {
        console.error(
          "Erro ao calcular rota:",
          error
        );

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

  /*
   * Verifica automaticamente se o ônibus
   * chegou perto da próxima parada.
   */
  useEffect(() => {
    if (
      !onibusPosicao ||
      paradas.length === 0 ||
      proximaParada >= paradas.length
    ) {
      return;
    }

    const paradaAtual =
      paradas[proximaParada];

    const distancia = distanciaMetros(
      onibusPosicao,
      paradaAtual.coords
    );

    console.log(
      `Distância até ${paradaAtual.nome}: ${Math.round(
        distancia
      )}m`
    );

    if (
      distancia <= RAIO_PARADA_METROS
    ) {
      console.log(
        `Parada concluída: ${paradaAtual.nome}`
      );

      setProximaParada((atual) =>
        Math.min(
          atual + 1,
          paradas.length
        )
      );
    }
  }, [
    onibusPosicao,
    paradas,
    proximaParada,
  ]);

  /*
   * Calcula somente o trecho restante da rota.
   */
  const rotaRestante = useMemo(() => {
    if (rotaRuas.length < 2) {
      return rotaRuas;
    }

    if (!onibusPosicao) {
      return rotaRuas;
    }

    const resultado =
      encontrarPosicaoNaRota(
        rotaRuas,
        onibusPosicao
      );

    /*
     * Não deixa o progresso voltar por causa
     * de uma pequena oscilação do GPS.
     */
    if (
      resultado.segmento >
      maiorSegmentoPercorrido.current
    ) {
      maiorSegmentoPercorrido.current =
        resultado.segmento;
    }

    const segmento =
      maiorSegmentoPercorrido.current;

    /*
     * Se o ônibus já terminou todas as paradas,
     * ainda podemos mostrar o restante da rota
     * até o destino final.
     */
    if (
      resultado.segmento >= segmento
    ) {
      return [
        resultado.ponto,
        ...rotaRuas.slice(
          resultado.segmento + 1
        ),
      ];
    }

    return rotaRuas.slice(segmento);
  }, [rotaRuas, onibusPosicao]);

  const centroMapa =
    onibusPosicao ?? origem;

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

      <div
        style={{
          marginBottom: 10,
          padding: "10px 14px",
          background: "#eff6ff",
          borderRadius: 8,
          color: "#1e3a8a",
          fontWeight: 600,
        }}
      >
        {proximaParada < paradas.length ? (
          <>
            Próxima parada:{" "}
            {paradas[proximaParada].nome}
          </>
        ) : (
          <>Todas as paradas foram concluídas ✓</>
        )}
      </div>

      <MapContainer
        center={centroMapa}
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

        {/*
         * SOMENTE O TRAJETO AINDA NÃO PERCORRIDO
         */}
        {rotaRestante.length > 1 && (
          <Polyline
            positions={rotaRestante}
            pathOptions={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.8,
            }}
          />
        )}

        {/*
         * PARADAS
         */}
        {paradas.map((parada, i) => {
          const concluida =
            i < proximaParada;

          const proxima =
            i === proximaParada;

          return (
            <Marker
              key={`${parada.nome}-${i}`}
              position={parada.coords}
              icon={
                concluida
                  ? concluidaIcon
                  : proxima
                  ? proximaIcon
                  : defaultIcon
              }
            >
              <Popup>
                <strong>
                  {concluida
                    ? "✓ Parada concluída"
                    : proxima
                    ? "→ Próxima parada"
                    : `Parada ${i + 1}`}
                </strong>

                <br />

                {parada.nome}
              </Popup>
            </Marker>
          );
        })}

        {/*
         * ÔNIBUS
         */}
        {onibusPosicao && (
          <Marker
            position={onibusPosicao}
            icon={onibusIcon}
          >
            <Popup>
              🚌 Ônibus em tempo real
              <br />
              Próxima parada:{" "}
              {proximaParada <
              paradas.length
                ? paradas[
                    proximaParada
                  ].nome
                : "Fim da rota"}
            </Popup>
          </Marker>
        )}

        <Recenter pos={centroMapa} />
      </MapContainer>
    </div>
  );
}