"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

const MapComponent = dynamic(
  () => import("../../components/MapComponent"),
  { ssr: false }
);

type Parada = {
  nome: string;
  coords: [number, number];
  tempo: string;
  distancia: string;
};

const origemPadrao: [number, number] = [
  -4.181536803977927,
  -38.459371465206424,
];

// 🟦 ROTAS
const paradasAldeiaPark = [
  { nome: "Smartfit", coords: [-4.1816, -38.4593] as [number, number] },
  { nome: "Sabor Divino", coords: [-4.1803, -38.4594] as [number, number] },
  { nome: "Dione", coords: [-4.1831, -38.4674] as [number, number] },
  { nome: "Coriolano", coords: [-4.1732, -38.4611] as [number, number] },
  { nome: "Liceu", coords: [-4.1685, -38.4630] as [number, number] },
];

const paradasBuriti = [
  { nome: "Madeireira Roma", coords: [-4.1769839, -38.4815915] as [number, number] },
  { nome: "Marina", coords: [-4.1755006, -38.4729274] as [number, number] },
  { nome: "MCR Lubrificantes", coords: [-4.1769030, -38.4785567] as [number, number] },
  { nome: "Municipal", coords: [-4.1752140, -38.4686224] as [number, number] },
  { nome: "Liceu", coords: [-4.1685, -38.4630] as [number, number] },
];

export default function Home() {
  const [bairro, setBairro] = useState("Aldeia Park");
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);

  const [origemAtual, setOrigemAtual] =
    useState<[number, number]>(origemPadrao);

  const [historico, setHistorico] = useState<any[]>([]);
  const [eta, setEta] = useState<number | null>(null);

  // 🚍 FIREBASE AO VIVO
  useEffect(() => {
    const rota = bairro === "Buriti" ? "buriti" : "aldeiaPark";

    const onibusRef = ref(db, `onibus/${rota}`);
    const histRef = ref(db, `historico/${rota}`);

    const unsub1 = onValue(onibusRef, (snap) => {
      const data = snap.val();

      if (data?.lat && data?.lng) {
        setOrigemAtual([data.lat, data.lng]);
      }
    });

    const unsub2 = onValue(histRef, (snap) => {
      const data = snap.val();

      if (!data) {
        setHistorico([]);
        return;
      }

      const lista = Object.values(data)
        .filter((p: any) =>
          p?.lat &&
          p?.lng &&
          typeof p.timestamp === "number"
        );

      setHistorico(lista);

      // 🔍 DEBUG IMPORTANTE
      console.log("HISTÓRICO:", lista);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [bairro]);

  // 🧠 ETA ULTRA ESTÁVEL
  function calcularETA(lista: any[], destino: [number, number]) {
    if (!lista || lista.length < 2) return null;

    const ultimo = lista[lista.length - 1];
    const anterior = lista[lista.length - 2];

    if (!ultimo?.lat || !anterior?.lat) return null;

    const toRad = (v: number) => (v * Math.PI) / 180;

    function distancia(a: any, b: any) {
      const R = 6371;

      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);

      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) *
          Math.cos(toRad(b.lat)) *
          Math.sin(dLng / 2) ** 2;

      return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    const distPercorrida = distancia(anterior, ultimo);

    const tempoMs = (ultimo.timestamp || 0) - (anterior.timestamp || 0);

    const horas = tempoMs > 0 ? tempoMs / 3600000 : 0;

    const velocidade =
      horas > 0 ? distPercorrida / horas : 25; // fallback ônibus

    const distDestino = distancia(ultimo, {
      lat: destino[0],
      lng: destino[1],
    });

    const etaHoras = distDestino / velocidade;

    const resultado = Math.max(Math.round(etaHoras * 60), 1);

    return isNaN(resultado) ? null : resultado;
  }

  // 🧠 ATUALIZA ETA SEM TRAVAR
  useEffect(() => {
    if (historico.length < 2) {
      setEta(null);
      return;
    }

    const rota =
      bairro === "Buriti"
        ? paradasBuriti
        : paradasAldeiaPark;

    const destino = rota[rota.length - 1].coords;

    const tempo = calcularETA(historico, destino);

    setEta(tempo);
  }, [historico, bairro]);

  // 📍 ROTA (ORIGINAL)
  useEffect(() => {
    const rota =
      bairro === "Buriti"
        ? paradasBuriti
        : paradasAldeiaPark;

    async function calcular() {
      setCarregando(true);

      let pontoAtual = origemAtual;
      let tempoTotal = 0;
      let distanciaTotal = 0;

      const resultados: Parada[] = [];

      const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;

      if (!apiKey) return;

      try {
        for (const parada of rota) {
          const response = await fetch(
            "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
            {
              method: "POST",
              headers: {
                Authorization: apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                coordinates: [
                  [pontoAtual[1], pontoAtual[0]],
                  [parada.coords[1], parada.coords[0]],
                ],
              }),
            }
          );

          const data = await response.json();

          if (!data?.features?.length) continue;

          const summary = data.features[0].properties.summary;

          const minutos = Math.ceil(summary.duration / 60);
          const km = summary.distance / 1000;

          tempoTotal += minutos;
          distanciaTotal += km;

          resultados.push({
            nome: parada.nome,
            coords: parada.coords,
            tempo: `${tempoTotal} min`,
            distancia: `${distanciaTotal.toFixed(1)} km`,
          });

          pontoAtual = parada.coords;
        }

        setParadas(resultados);
      } catch (err) {
        console.log(err);
      }

      setCarregando(false);
    }

    calcular();
  }, [bairro, origemAtual]);

  const rotaAtual =
    bairro === "Buriti"
      ? paradasBuriti
      : paradasAldeiaPark;

  return (
    <div style={{ fontFamily: "Arial", padding: 20 }}>

      <h1>🚌 Transporte Escolar</h1>

      <select value={bairro} onChange={(e) => setBairro(e.target.value)}>
        <option>Aldeia Park</option>
        <option>Buriti</option>
      </select>

      <div style={{
        marginTop: 10,
        padding: 10,
        background: "#111",
        color: "#fff"
      }}>
        <h3>🧠 IA ETA</h3>
        {eta ? (
          <p>Chegada: {eta} min</p>
        ) : (
          <p>Aguardando dados do ônibus...</p>
        )}
      </div>

      <button onClick={() => setMostrarMapa(!mostrarMapa)}>
        Mapa
      </button>

      {mostrarMapa && (
        <MapComponent
          origem={origemAtual}
          paradas={rotaAtual}
        />
      )}

    </div>
  );
}