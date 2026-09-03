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
 * Distância aproximada entre dois pontos.
 * Para descobrir qual trecho da rota está mais próximo
 * do ônibus.
 */
function distanciaQuadrada(a: Ponto, b: Ponto) {
  const lat = a[0] - b[0];
  const lng = a[1] - b[1];

  return lat * lat + lng * lng;
}

/*
 * Descobre o ponto EXATO de um segmento mais próximo
 * da posição do ônibus.
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
 * Encontra:
 *
 * - o ponto exato onde o ônibus está na rota;
 * - o índice do segmento correspondente.
 */
function encontrarPosicaoNaRota(
  rota: Ponto[],
  onibus: Ponto
) {
  let menorDistancia = Infinity;
  let melhorPonto: Ponto = rota[0];
  let melhorSegmento = 0;

  for (let i = 0; i < rota.length - 1; i++) {
    const ponto = pontoMaisProximoNoSegmento(
      onibus,
      rota[i],
      rota[i + 1]
    );

    const distancia = distanciaQuadrada(
      onibus,
      ponto
    );

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhorPonto = ponto;
      melhorSegmento = i;
    }
  }

  return {
    ponto: melhorPonto,
    segmento: melhorSegmento,
    distancia: menorDistancia,
  };
}

export default function MapComponent({
  origem,
  paradas,
  onibusPosicao,
}: Props) {
  const [rotaRuas, setRotaRuas] = useState<Ponto[]>([]);
  const [erroRota, setErroRota] = useState<string | null>(null);

  /*
   * Guarda o maior progresso alcançado pelo ônibus.
   *
   * Isso evita que um erro momentâneo do GPS faça
   * a rota já percorrida reaparecer.
   */
  const maiorSegmentoPercorrido = useRef(0);

  /*
   * Calcula a rota pelas ruas usando OpenRouteService.
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

        /*
         * Origem + paradas na ordem definida.
         */
        const pontos = [
          origem,
          ...paradas.map((parada) => parada.coords),
        ];

        /*
         * OpenRouteService:
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
          console.error("Resposta ORS:", data);

          throw new Error(
            "Não foi possível encontrar a rota."
          );
        }

        const geometry = data.features[0].geometry;

        /*
         * ORS:
         * [longitude, latitude]
         *
         * Leaflet:
         * [latitude, longitude]
         */
        const rotaConvertida: Ponto[] =
          geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [
              lat,
              lng,
            ]
          );

        setRotaRuas(rotaConvertida);

        /*
         * Quando a rota muda, reinicia o progresso.
         */
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
   * Calcula automaticamente o restante da rota.
   */
  const rotaRestante = useMemo(() => {
    if (
      !onibusPosicao ||
      rotaRuas.length < 2
    ) {
      return rotaRuas;
    }

    const resultado = encontrarPosicaoNaRota(
      rotaRuas,
      onibusPosicao
    );

    /*
     * Evita que o GPS faça o ônibus voltar
     * para um trecho que já foi percorrido.
     */
    if (
      resultado.segmento >
      maiorSegmentoPercorrido.current
    ) {
      maiorSegmentoPercorrido.current =
        resultado.segmento;
    }

    const segmentoAtual =
      maiorSegmentoPercorrido.current;

    /*
     * Se o ônibus já avançou, começamos
     * exatamente na posição dele.
     */
    if (
      resultado.segmento >=
      maiorSegmentoPercorrido.current
    ) {
      return [
        resultado.ponto,
        ...rotaRuas.slice(
          resultado.segmento + 1
        ),
      ];
    }

    /*
     * Caso o GPS tenha dado uma pequena
     * oscilada para trás, mantém a rota
     * a partir do progresso anterior.
     */
    return rotaRuas.slice(segmentoAtual);
  }, [rotaRuas, onibusPosicao]);

  /*
   * Se existe posição do ônibus, usamos ela.
   * Caso contrário, usamos a origem.
   */
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
         * SOMENTE A PARTE DA ROTA QUE AINDA FALTA
         */
        rotaRestante.length > 1 && (
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
        {paradas.map((parada, i) => (
          <Marker
            key={`${parada.nome}-${i}`}
            position={parada.coords}
            icon={defaultIcon}
          >
            <Popup>
              <strong>
                Parada {i + 1}
              </strong>
              <br />
              {parada.nome}
            </Popup>
          </Marker>
        ))}

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
            </Popup>
          </Marker>
        )}

        <Recenter pos={centroMapa} />
      </MapContainer>
    </div>
  );
}