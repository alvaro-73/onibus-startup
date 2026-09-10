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
 * Distância aproximada entre dois pontos.
 *
 * Usada somente para descobrir
 * qual ponto/segmento da rota é mais próximo.
 */
function distanciaQuadrada(a: Ponto, b: Ponto) {
  const lat = a[0] - b[0];
  const lng = a[1] - b[1];

  return lat * lat + lng * lng;
}

/*
 * Calcula o ponto mais próximo de um ponto
 * dentro de um segmento da rota.
 *
 * IMPORTANTE:
 * O resultado sempre fica SOBRE o segmento original.
 *
 * Isso evita criar uma linha artificial
 * atravessando casas.
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
 * Encontra a posição do ônibus
 * na geometria original da rota.
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

/*
 * Encontra o ponto da rota mais próximo
 * da parada e retorna seu índice.
 *
 * Procuramos nos SEGMENTOS, e não apenas
 * nos vértices, porque a coordenada exata
 * da parada normalmente não é um vértice
 * da geometria do OpenRouteService.
 */
function encontrarPosicaoDaParadaNaRota(
  rota: Ponto[],
  parada: Ponto
) {
  if (rota.length === 0) {
    return {
      ponto: parada,
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
        parada,
        rota[i],
        rota[i + 1]
      );

    const distancia =
      distanciaQuadrada(parada, ponto);

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
  const [rotaRuas, setRotaRuas] =
    useState<Ponto[]>([]);

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
   * A API continua sendo chamada exatamente
   * como antes.
   *
   * Origem → parada 1 → parada 2 → parada 3...
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
         * Leaflet usa:
         * [latitude, longitude]
         *
         * ORS recebe:
         * [longitude, latitude]
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

        /*
         * Converte novamente para:
         * [latitude, longitude]
         */
        const rotaConvertida: Ponto[] =
          geometry.coordinates.map(
            ([lng, lat]: [
              number,
              number
            ]) => [lat, lng]
          );

        /*
         * GUARDA A ROTA ORIGINAL.
         *
         * Nunca modificamos essa geometria
         * para criar caminhos artificiais.
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
         * Fallback somente se a API falhar.
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
   * A chegada continua sendo baseada
   * na posição REAL do GPS.
   *
   * Não usamos a posição projetada na rua
   * para decidir se chegou.
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
   * TRECHO DO ÔNIBUS ATÉ A PRÓXIMA PARADA
   * =====================================================
   *
   * ESTA É A PARTE MAIS IMPORTANTE.
   *
   * O resultado será:
   *
   * 🚌 posição do ônibus
   *       ↓
   * rota original pelas ruas
   *       ↓
   * próxima parada
   *
   * Não criamos uma linha direta até a parada.
   */
  const rotaRestante = useMemo(() => {
    /*
     * Não existe rota válida.
     */
    if (rotaRuas.length < 2) {
      return [];
    }

    /*
     * Todas as paradas foram concluídas.
     */
    if (
      proximaParada >= paradas.length
    ) {
      return [];
    }

    const paradaAtual =
      paradas[proximaParada];

    /*
     * -----------------------------------------------------
     * SEM GPS DO ÔNIBUS
     * -----------------------------------------------------
     *
     * Nesse caso mostramos a rota original
     * desde a origem ou desde a parada anterior
     * até a próxima parada.
     */
    if (!onibusPosicao) {
      const pontoInicial =
        proximaParada === 0
          ? origem
          : paradas[
              proximaParada - 1
            ].coords;

      const posicaoInicial =
        encontrarPosicaoDaParadaNaRota(
          rotaRuas,
          pontoInicial
        );

      const posicaoFinal =
        encontrarPosicaoDaParadaNaRota(
          rotaRuas,
          paradaAtual.coords
        );

      /*
       * Usa somente a geometria original.
       */
      if (
        posicaoFinal.segmento <
        posicaoInicial.segmento
      ) {
        return [];
      }

      return [
        posicaoInicial.ponto,
        ...rotaRuas.slice(
          posicaoInicial.segmento + 1,
          posicaoFinal.segmento + 1
        ),
        posicaoFinal.ponto,
      ];
    }

    /*
     * -----------------------------------------------------
     * COM GPS DO ÔNIBUS
     * -----------------------------------------------------
     */

    /*
     * Descobre onde o ônibus está
     * sobre a rota original.
     */
    const posicaoOnibus =
      encontrarPosicaoNaRota(
        rotaRuas,
        onibusPosicao
      );

    /*
     * Descobre onde a próxima parada está
     * sobre a mesma rota original.
     */
    const posicaoParada =
      encontrarPosicaoDaParadaNaRota(
        rotaRuas,
        paradaAtual.coords
      );

    /*
     * Se a posição encontrada da parada
     * estiver antes do ônibus na geometria,
     * não podemos simplesmente desenhar
     * para trás.
     *
     * Isso pode acontecer por pequenas
     * oscilações do GPS.
     */
    if (
      posicaoParada.segmento <
      posicaoOnibus.segmento
    ) {
      return [];
    }

    /*
     * =====================================================
     * AQUI ESTÁ O CAMINHO CORRETO
     * =====================================================
     *
     * Primeiro ponto:
     *     posição do ônibus PROJETADA SOBRE A RUA
     *
     * Depois:
     *     pontos ORIGINAIS da rota ORS
     *
     * Último ponto:
     *     posição da parada PROJETADA SOBRE A RUA
     *
     * Não colocamos:
     *
     *     paradas[proximaParada].coords
     *
     * no final.
     *
     * Isso evita criar uma reta artificial
     * entre a rota e a coordenada da parada.
     */
    return [
      posicaoOnibus.ponto,

      ...rotaRuas.slice(
        posicaoOnibus.segmento + 1,
        posicaoParada.segmento + 1
      ),

      posicaoParada.ponto,
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
   *
   * O marcador também é colocado na rota original.
   *
   * Assim, se o GPS estiver alguns metros
   * fora da rua, o ícone não aparece
   * dentro de uma casa.
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

        {/* =================================================
            TRAJETO TRACEJADO
            
            SOMENTE:
            
            🚌 ÔNIBUS
                ↓
            RUAS DA ROTA ORIGINAL
                ↓
            PRÓXIMA PARADA
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