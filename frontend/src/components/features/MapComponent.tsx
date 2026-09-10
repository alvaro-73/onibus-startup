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

/*
 * =========================================================
 * POSIÇÃO DE UMA PARADA NA ROTA
 * =========================================================
 *
 * Procura o ponto da rua mais próximo da parada,
 * mas somente dentro de uma parte específica da rota.
 *
 * Isso é importante para respeitar a ordem das paradas.
 */
function encontrarParadaNaParteDaRota(
  rota: Ponto[],
  parada: Ponto,
  inicio: number,
  fim: number
) {
  if (rota.length < 2) {
    return {
      ponto: rota[0] ?? parada,
      segmento: 0,
    };
  }

  const inicioSeguro = Math.max(
    0,
    Math.min(inicio, rota.length - 2)
  );

  const fimSeguro = Math.max(
    inicioSeguro + 1,
    Math.min(fim, rota.length - 1)
  );

  let menorDistancia = Infinity;
  let melhorPonto = rota[inicioSeguro];
  let melhorSegmento = inicioSeguro;

  for (
    let i = inicioSeguro;
    i < fimSeguro;
    i++
  ) {
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

/*
 * =========================================================
 * ENCONTRA AS PARADAS NA ORDEM DA ROTA
 * =========================================================
 *
 * Como o ORS recebeu:
 *
 * origem → parada 1 → parada 2 → parada 3...
 *
 * a geometria também segue essa ordem.
 *
 * Então procuramos:
 *
 * parada 1 somente depois da origem
 * parada 2 depois da parada 1
 * parada 3 depois da parada 2
 *
 * Isso evita pegar um trecho errado da rota.
 */
function encontrarPosicoesDasParadas(
  rota: Ponto[],
  origem: Ponto,
  paradas: Parada[]
) {
  const resultado: {
    ponto: Ponto;
    segmento: number;
  }[] = [];

  if (rota.length < 2) {
    return resultado;
  }

  let inicioBusca = 0;

  /*
   * Primeiro localizamos a origem.
   */
  const origemRota =
    encontrarParadaNaParteDaRota(
      rota,
      origem,
      0,
      Math.min(
        rota.length - 1,
        Math.max(20, Math.floor(rota.length * 0.25))
      )
    );

  inicioBusca = origemRota.segmento;

  for (let i = 0; i < paradas.length; i++) {
    /*
     * Para cada parada, procuramos somente
     * depois da parada anterior.
     */
    const restante =
      rota.length - inicioBusca;

    /*
     * Como a próxima parada está depois da anterior,
     * usamos o restante da geometria.
     */
    const paradaRota =
      encontrarParadaNaParteDaRota(
        rota,
        paradas[i].coords,
        inicioBusca,
        rota.length - 1
      );

    resultado.push(paradaRota);

    /*
     * A próxima busca começa depois
     * desta parada.
     */
    inicioBusca = Math.min(
      paradaRota.segmento + 1,
      rota.length - 2
    );

    void restante;
  }

  return resultado;
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
   * 0 = parada 1
   * 1 = parada 2
   * 2 = parada 3
   */
  const [proximaParada, setProximaParada] =
    useState(0);

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
   * =========================================================
   * DETECTA CHEGADA À PRÓXIMA PARADA
   * =========================================================
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
   * =========================================================
   * POSIÇÕES DAS PARADAS NA ROTA
   * =========================================================
   *
   * Calculamos a posição de cada parada
   * na geometria original.
   */
  const posicoesDasParadas =
    useMemo(() => {
      if (
        rotaRuas.length < 2 ||
        paradas.length === 0
      ) {
        return [];
      }

      return encontrarPosicoesDasParadas(
        rotaRuas,
        origem,
        paradas
      );
    }, [
      rotaRuas,
      origem,
      paradas,
    ]);

  /*
   * =========================================================
   * TRECHO TRACEJADO
   * =========================================================
   *
   * REGRA:
   *
   * 🚌 ônibus → próxima parada
   *
   * MAS:
   *
   * o caminho entre eles é formado SOMENTE
   * pelos pontos da rota original.
   */
  const rotaRestante = useMemo(() => {
    if (
      rotaRuas.length < 2 ||
      !onibusPosicao ||
      proximaParada >= paradas.length
    ) {
      return [];
    }

    /*
     * Precisamos ter encontrado a próxima parada
     * dentro da geometria da rota.
     */
    if (
      !posicoesDasParadas[
        proximaParada
      ]
    ) {
      return [];
    }

    /*
     * -----------------------------------------------------
     * POSIÇÃO DO ÔNIBUS
     * -----------------------------------------------------
     */
    const posicaoOnibus =
      encontrarPosicaoNaRota(
        rotaRuas,
        onibusPosicao
      );

    /*
     * -----------------------------------------------------
     * POSIÇÃO DA PRÓXIMA PARADA
     * -----------------------------------------------------
     */
    const posicaoParada =
      posicoesDasParadas[
        proximaParada
      ];

    /*
     * -----------------------------------------------------
     * CASO NORMAL
     * -----------------------------------------------------
     *
     * O ônibus está antes da parada.
     */
    if (
      posicaoOnibus.segmento <=
      posicaoParada.segmento
    ) {
      const trecho = [
        /*
         * COMEÇA NO ÔNIBUS.
         *
         * Esse ponto foi projetado sobre
         * a rua original.
         */
        posicaoOnibus.ponto,

        /*
         * CONTINUA EXATAMENTE PELA
         * GEOMETRIA ORIGINAL DO ORS.
         */
        ...rotaRuas.slice(
          posicaoOnibus.segmento + 1,
          posicaoParada.segmento + 1
        ),

        /*
         * TERMINA NO PONTO DA RUA MAIS
         * PRÓXIMO DA PARADA.
         *
         * NÃO usamos a coordenada crua
         * da parada aqui.
         */
        posicaoParada.ponto,
      ];

      /*
       * Remove pontos duplicados consecutivos.
       */
      return trecho.filter(
        (ponto, index, array) => {
          if (index === 0) {
            return true;
          }

          return (
            ponto[0] !==
              array[index - 1][0] ||
            ponto[1] !==
              array[index - 1][1]
          );
        }
      );
    }

    /*
     * -----------------------------------------------------
     * GPS PASSOU UM POUCO DO SEGMENTO DA PARADA
     * -----------------------------------------------------
     *
     * Isso pode acontecer por:
     *
     * - GPS impreciso
     * - ônibus fora da rua alguns metros
     * - curva da rua
     *
     * Não vamos desenhar uma linha reta.
     *
     * O correto é aguardar a detecção de chegada
     * pelo raio de 50 metros.
     *
     * Portanto, nesse caso não desenhamos um
     * caminho incorreto para trás.
     */
    return [];
  }, [
    rotaRuas,
    onibusPosicao,
    proximaParada,
    paradas,
    posicoesDasParadas,
  ]);

  /*
   * =========================================================
   * POSIÇÃO VISUAL DO ÔNIBUS
   * =========================================================
   *
   * O marcador fica sobre a rua mais próxima
   * da rota original.
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