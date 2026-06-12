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
  { nome: "Madeireira Roma", coords: [-4.176983918564992, -38.481591544426514] as [number, number] },
  { nome: "Marina", coords: [-4.175500619426942, -38.47292743842063] as [number, number] },
  { nome: "MCR Lubrificantes", coords: [-4.176903072507907, -38.478556766483585] as [number, number] },
  { nome: "Municipal", coords: [-4.175214072946176, -38.46862240569411] as [number, number] },
  { nome: "Liceu", coords: [-4.1685, -38.4630] as [number, number] },
];

export default function Home() {
  const [bairro, setBairro] = useState("Aldeia Park");
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarMapa, setMostrarMapa] = useState(false);

  const [origemAtual, setOrigemAtual] =
    useState<[number, number]>(origemPadrao);

  // 🧠 IA STATE
  const [historico, setHistorico] = useState<any[]>([]);
  const [eta, setEta] = useState<number | null>(null);

  // 🚍 ESCUTA ONIBUS EM TEMPO REAL
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
      const data = snap.val() || {};
      setHistorico(Object.values(data));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [bairro]);

  // 🧠 FUNÇÃO IA (ETA SIMPLES REAL)
  function calcularETA(lista: any[], destino: [number, number]) {
    if (!lista || lista.length < 2) return null;

    const ultimo = lista[lista.length - 1];
    const anterior = lista[lista.length - 2];

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

    const tempoMs = ultimo.timestamp - anterior.timestamp;
    const horas = tempoMs / 3600000;

    const velocidade = distPercorrida / (horas || 0.0001);

    const distDestino = distancia(ultimo, {
      lat: destino[0],
      lng: destino[1],
    });

    const etaHoras = distDestino / (velocidade || 1);

    return Math.max(Math.round(etaHoras * 60), 1);
  }

  // 🧠 ATUALIZA ETA AUTOMATICAMENTE
  useEffect(() => {
    if (!historico.length) return;

    const rota =
      bairro === "Buriti"
        ? paradasBuriti
        : paradasAldeiaPark;

    const destino = rota[rota.length - 1].coords;

    const tempo = calcularETA(historico, destino);

    setEta(tempo);
  }, [historico, bairro]);

  // 📍 ROTAS
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

      if (!apiKey) {
        setCarregando(false);
        return;
      }

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

          if (!response.ok || !data?.features?.length) continue;

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
        console.error(err);
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
    <div style={{ fontFamily: "Arial", minHeight: "100vh", background: "#eef4ff" }}>
      
      <header style={{
        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
        color: "white",
        padding: 25
      }}>
        <h1>🚌 Transporte Escolar</h1>
        <p>Rastreamento em tempo real + IA de chegada</p>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>

        {/* SELECT */}
        <div style={{ background: "white", padding: 20, borderRadius: 16 }}>
          <label><b>Bairro</b></label>

          <select
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            style={{ width: "100%", padding: 12, marginTop: 10 }}
          >
            <option>Aldeia Park</option>
            <option>Buriti</option>
          </select>
        </div>

        {/* 🧠 IA ETA */}
        <div style={{
          marginTop: 15,
          background: "#0f172a",
          color: "white",
          padding: 15,
          borderRadius: 12
        }}>
          <h3>🧠 IA de Previsão</h3>

          {eta ? (
            <p>🚌 Chegada estimada: <b>{eta} min</b></p>
          ) : (
            <p>Calculando previsão...</p>
          )}
        </div>

        {/* PARADAS */}
        <div style={{ marginTop: 20 }}>
          {carregando ? (
            <p>⏳ Calculando rota...</p>
          ) : (
            paradas.map((p, i) => (
              <div key={i} style={{
                background: "white",
                padding: 15,
                marginBottom: 10,
                borderRadius: 12
              }}>
                <b>{p.nome}</b>
                <p>{p.distancia}</p>
                <span>{p.tempo}</span>
              </div>
            ))
          )}
        </div>

        {/* MAPA */}
        <button
          onClick={() => setMostrarMapa(!mostrarMapa)}
          style={{
            width: "100%",
            marginTop: 20,
            padding: 15,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 12
          }}
        >
          {mostrarMapa ? "Fechar mapa" : "Ver mapa em tempo real"}
        </button>

        {mostrarMapa && (
          <div style={{ marginTop: 20 }}>
            <MapComponent
              origem={origemAtual}
              paradas={rotaAtual}
            />
          </div>
        )}

      </main>
    </div>
  );
}