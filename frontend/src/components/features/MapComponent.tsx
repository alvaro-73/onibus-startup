"use client";

import { useEffect, useRef, useState } from "react";
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
  proximaParada: number;
};

const defaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
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
    map.panTo(pos, { animate: true, duration: 1.5 });
  }, [pos, map]);

  return null;
}

function AnimatedBusMarker({
  destino,
  nomeDaProximaParada,
}: {
  destino: Ponto;
  nomeDaProximaParada: string;
}) {
  const [posicao, setPosicao] = useState<Ponto>(destino);
  const posicaoAnteriorRef = useRef<Ponto>(destino);

  useEffect(() => {
    const inicio = posicaoAnteriorRef.current;
    const inicioAnimacao = performance.now();
    const duracao = 1800;
    let frame: number;

    function animar(agora: number) {
      const progresso = Math.min((agora - inicioAnimacao) / duracao, 1);
      const suavizado = 1 - (1 - progresso) ** 3;
      const proximaPosicao: Ponto = [
        inicio[0] + (destino[0] - inicio[0]) * suavizado,
        inicio[1] + (destino[1] - inicio[1]) * suavizado,
      ];

      posicaoAnteriorRef.current = proximaPosicao;
      setPosicao(proximaPosicao);

      if (progresso < 1) {
        frame = requestAnimationFrame(animar);
      } else {
        posicaoAnteriorRef.current = destino;
      }
    }

    frame = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(frame);
  }, [destino]);

  return (
    <Marker position={posicao} icon={onibusIcon}>
      <Popup>
        🚌 Ônibus em tempo real
        <br />
        Próxima parada: {nomeDaProximaParada}
      </Popup>
    </Marker>
  );
}

/*
 * =========================================================
 * DISTÂNCIA EM METROS
 * =========================================================
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
 * =========================================================
 * DISTÂNCIA QUADRADA
 * =========================================================
 */
function distanciaQuadrada(a: Ponto, b: Ponto) {
  const lat = a[0] - b[0];
  const lng = a[1] - b[1];

  return lat * lat + lng * lng;
}

/*
 * =========================================================
 * PONTO MAIS PRÓXIMO DE UM SEGMENTO
 * =========================================================
 *
 * O resultado sempre fica dentro do segmento
 * original da rota.
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
 * =========================================================
 * POSIÇÃO DO ÔNIBUS NA ROTA
 * =========================================================
 *
 * Procura em toda a geometria da rota o segmento
 * de rua mais próximo do GPS.
 */
function encontrarPosicaoNaRota(
  rota: Ponto[],
  onibus: Ponto
) {
  if (rota.length === 0) {
    return {
      ponto: onibus,
      segmento: 0,
    };
  }

  if (rota.length === 1) {
    return {
      ponto: rota[0],
      segmento: 0,
    };
  }

  let menorDistancia = Infinity;
  let melhorPonto = rota[0];
  let melhorSegmento = 0;

  for (let i = 0; i < rota.length - 1; i++) {
    const ponto =
      pontoMaisProximoNoSegmento(
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
  proximaParada,
}: Props) {
  const [rotaRuas, setRotaRuas] =
    useState<Ponto[]>([]);

  const [erroRota, setErroRota] =
    useState<string | null>(null);

  /*
   * =========================================================
   * CALCULA A ROTA PELAS RUAS
   * =========================================================
   */
  useEffect(() => {
    async function buscarRota() {
      if (
        !origem ||
        paradas.length === 0
      ) {
        setRotaRuas([]);
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

        /*
         * Leaflet:
         * [lat, lng]
         *
         * ORS:
         * [lng, lat]
         */
        const coordinates =
          pontos.map(
            ([lat, lng]) => [lng, lat]
          );

        const response = await fetch(
          "/api/rotas",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              coordinates,
            }),
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.features ||
          data.features.length === 0
        ) {
          console.error(
            "Resposta da API de rotas:",
            data
          );

          throw new Error(
            "Não foi possível encontrar a rota."
          );
        }

        const geometry =
          data.features[0].geometry;

        const rotaConvertida: Ponto[] =
          geometry.coordinates.map(
            ([lng, lat]: [
              number,
              number
            ]) => [lat, lng]
          );

        /*
         * Guarda exatamente a geometria
         * devolvida pelo ORS.
         */
        setRotaRuas(
          rotaConvertida
        );
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

        /*
         * IMPORTANTE:
         *
         * Não desenhamos linhas retas
         * como fallback.
         *
         * Se o serviço de rota falhar,
         * é melhor não mostrar um caminho
         * incorreto atravessando casas.
         */
        setRotaRuas([]);
      }
    }

    buscarRota();
  }, [origem, paradas]);

  /*
   * A linha exibida é uma rota nova, calculada somente entre a localização
   * atual do ônibus e a parada atual. Assim ela nunca atravessa ou aponta
   * para as outras paradas da rota geral.
   */
  const [rotaRestante, setRotaRestante] = useState<Ponto[]>([]);

  useEffect(() => {
    if (!onibusPosicao || proximaParada >= paradas.length) {
      setRotaRestante([]);
      return;
    }

    setRotaRestante([]);
    let cancelado = false;
    const posicaoAtual = onibusPosicao;
    const paradaAtual = paradas[proximaParada];

    async function buscarTrechoAtual() {
      try {
        const response = await fetch("/api/rotas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coordinates: [
              [posicaoAtual[1], posicaoAtual[0]],
              [paradaAtual.coords[1], paradaAtual.coords[0]],
            ],
          }),
        });
        const data = await response.json();

        if (cancelado || !response.ok || !data?.features?.length) {
          return;
        }

        const geometria = data.features[0].geometry?.coordinates;
        if (!Array.isArray(geometria)) {
          return;
        }

        setRotaRestante(
          geometria.map(([lng, lat]: [number, number]) => [lat, lng])
        );
      } catch (error) {
        if (!cancelado) {
          console.error("Erro ao calcular o trecho até a parada:", error);
          setRotaRestante([]);
        }
      }
    }

    void buscarTrechoAtual();

    return () => {
      cancelado = true;
    };
  }, [onibusPosicao, paradas, proximaParada]);

  /*
   * =========================================================
   * POSIÇÃO VISUAL DO ÔNIBUS
   * =========================================================
   *
   * O marcador fica sobre a rua mais próxima
   * da rota original.
   */
  const onibusPosicaoExibida = onibusPosicao ?? null;

  const centroMapa =
    onibusPosicaoExibida ?? origem;

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
        {proximaParada <
        paradas.length ? (
          <>
            Próxima parada:{" "}
            {paradas[
              proximaParada
            ].nome}
          </>
        ) : (
          <>
            Todas as paradas foram
            concluídas ✓
          </>
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

        {/* =================================================
            TRAJETO DO ÔNIBUS ATÉ A PRÓXIMA PARADA
        ================================================= */}
        {rotaRestante.length > 1 && (
          <Polyline
            positions={rotaRestante}
            pathOptions={{
              color: "#2563eb",
              weight: 5,
              opacity: 0.8,
              dashArray: "10, 10",
            }}
          />
        )}

        {/* =================================================
            PARADAS
        ================================================= */}
        {paradas.map(
          (parada, i) => {
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
          }
        )}

        {/* =================================================
            ÔNIBUS
        ================================================= */}
        {onibusPosicaoExibida && (
          <AnimatedBusMarker
            destino={onibusPosicaoExibida}
            nomeDaProximaParada={
              proximaParada < paradas.length
                ? paradas[proximaParada].nome
                : "Fim da rota"
            }
          />
        )}

        <Recenter pos={centroMapa} />
      </MapContainer>
    </div>
  );
}
