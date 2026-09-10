"use client";

import { useEffect, useMemo, useState } from "react";
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
    map.setView(pos);
  }, [pos, map]);

  return null;
}

/*
 * Distância entre duas coordenadas em metros.
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
 * Calcula o ponto mais próximo entre um ponto
 * e um segmento da rota.
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
 * Encontra o ponto da rota mais próximo
 * do ônibus e o índice do segmento.
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
      Math.pow(
        ponto[0] - onibus[0],
        2
      ) +
      Math.pow(
        ponto[1] - onibus[1],
        2
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
  };
}

/*
 * Encontra o ponto da rota mais próximo
 * de uma parada.
 */
function encontrarIndiceDaParadaNaRota(
  rota: Ponto[],
  parada: Ponto
) {
  if (rota.length === 0) {
    return 0;
  }

  let menorDistancia = Infinity;
  let melhorIndice = 0;

  for (let i = 0; i < rota.length; i++) {
    const distancia =
      Math.pow(rota[i][0] - parada[0], 2) +
      Math.pow(rota[i][1] - parada[1], 2);

    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhorIndice = i;
    }
  }

  return melhorIndice;
}

export default function MapComponent({
  origem,
  paradas,
  onibusPosicao,
}: Props) {
  const [rotaRuas, setRotaRuas] = useState<Ponto[]>([]);
  const [erroRota, setErroRota] =
    useState<string | null>(null);

  /*
   * Índice da próxima parada.
   *
   * 0 = parada 1
   * 1 = parada 2
   * 2 = parada 3
   */
  const [proximaParada, setProximaParada] =
    useState(0);

  /*
   * =====================================================
   * ROTA COMPLETA PELAS RUAS
   * =====================================================
   *
   * Esta rota é calculada uma única vez para:
   *
   * origem → parada 1 → parada 2 → parada 3...
   *
   * Depois usamos os pontos dela para montar
   * somente o trecho que interessa.
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

        setRotaRuas(rotaConvertida);
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
         * Fallback caso a API falhe.
         */
        setRotaRuas([
          origem,
          ...paradas.map(
            (parada) => parada.coords
          ),
        ]);
      }
    }

    buscarRota();
  }, [origem, paradas]);

  /*
   * =====================================================
   * DETECTA CHEGADA À PRÓXIMA PARADA
   * =====================================================
   *
   * O ônibus precisa chegar a até 50 metros.
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

    const distancia =
      distanciaMetros(
        onibusPosicao,
        paradaAtual.coords
      );

    console.log(
      `Distância até ${paradaAtual.nome}: ${Math.round(
        distancia
      )}m`
    );

    if (
      distancia <=
      RAIO_PARADA_METROS
    ) {
      console.log(
        `Parada concluída: ${paradaAtual.nome}`
      );

      setProximaParada(
        (atual) =>
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
   * =====================================================
   * TRECHO TRACEJADO
   * =====================================================
   *
   * AQUI ESTÁ A PRINCIPAL CORREÇÃO.
   *
   * O começo do tracejado é o ônibus.
   *
   * O final é a próxima parada.
   *
   * Exemplo:
   *
   *          🚌
   *          ↓
   * ────────────────→ PARADA 1
   *
   * Depois:
   *
   *                    🚌
   *                    ↓
   * PARADA 1 ───────────────→ PARADA 2
   *
   * Depois:
   *
   *                         🚌
   *                         ↓
   * PARADA 2 ───────────────────→ PARADA 3
   */
  const rotaRestante = useMemo(() => {
    /*
     * Sem rota pelas ruas, usa uma linha
     * entre o ônibus e a próxima parada.
     */
    if (rotaRuas.length < 2) {
      if (
        onibusPosicao &&
        proximaParada <
          paradas.length
      ) {
        return [
          onibusPosicao,
          paradas[proximaParada]
            .coords,
        ];
      }

      return [];
    }

    /*
     * Todas as paradas já foram concluídas.
     */
    if (
      proximaParada >= paradas.length
    ) {
      return [];
    }

    /*
     * Se não temos posição do ônibus,
     * mostramos o trecho completo
     * a partir da origem/parada anterior.
     */
    if (!onibusPosicao) {
      const pontoInicial =
        proximaParada === 0
          ? origem
          : paradas[
              proximaParada - 1
            ].coords;

      const indiceFinal =
        encontrarIndiceDaParadaNaRota(
          rotaRuas,
          paradas[proximaParada]
            .coords
        );

      /*
       * Encontra o ponto inicial da rota.
       */
      const indiceInicial =
        proximaParada === 0
          ? 0
          : encontrarIndiceDaParadaNaRota(
              rotaRuas,
              pontoInicial
            );

      return rotaRuas.slice(
        indiceInicial,
        indiceFinal + 1
      );
    }

    /*
     * Encontra onde o ônibus está
     * na rota pelas ruas.
     */
    const posicao =
      encontrarPosicaoNaRota(
        rotaRuas,
        onibusPosicao
      );

    /*
     * Encontra onde a próxima parada
     * está na rota.
     */
    const indiceParada =
      encontrarIndiceDaParadaNaRota(
        rotaRuas,
        paradas[proximaParada]
          .coords
      );

    /*
     * O ônibus pode estar um pouco antes
     * ou depois do ponto encontrado para
     * a parada devido à precisão do GPS.
     */
    if (
      indiceParada <=
      posicao.segmento
    ) {
      return [
        posicao.ponto,
        paradas[proximaParada]
          .coords,
      ];
    }

    /*
     * COMEÇA EXATAMENTE NO ÔNIBUS
     * E SEGUE PELAS RUAS ATÉ A PRÓXIMA PARADA.
     */
    return [
      posicao.ponto,
      ...rotaRuas.slice(
        posicao.segmento + 1,
        indiceParada + 1
      ),
      paradas[proximaParada]
        .coords,
    ];
  }, [
    rotaRuas,
    onibusPosicao,
    proximaParada,
    paradas,
    origem,
  ]);

  /*
   * =====================================================
   * POSIÇÃO VISUAL DO ÔNIBUS
   * =====================================================
   */
  const onibusPosicaoExibida =
    useMemo<Ponto | null>(() => {
      if (!onibusPosicao) {
        return null;
      }

      if (rotaRuas.length < 2) {
        return onibusPosicao;
      }

      return encontrarPosicaoNaRota(
        rotaRuas,
        onibusPosicao
      ).ponto;
    }, [
      rotaRuas,
      onibusPosicao,
    ]);

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

        {/*
         * =================================================
         * TRACEJADO
         * =================================================
         *
         * Sempre:
         *
         * ÔNIBUS → PRÓXIMA PARADA
         */
        }
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

        {/*
         * =================================================
         * PARADAS
         * =================================================
         */}
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

        {/*
         * =================================================
         * ÔNIBUS
         * =================================================
         */}
        {onibusPosicaoExibida && (
          <Marker
            position={
              onibusPosicaoExibida
            }
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
