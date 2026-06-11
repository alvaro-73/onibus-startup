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

// 🟦 ALDEIA PARK
const paradasAldeiaPark = [
  { nome: "Smartfit", coords: [-4.1816, -38.4593] as [number, number] },
  { nome: "Sabor Divino", coords: [-4.1803, -38.4594] as [number, number] },
  { nome: "Dione", coords: [-4.1831, -38.4674] as [number, number] },
  { nome: "Coriolano", coords: [-4.1732, -38.4611] as [number, number] },
  { nome: "Liceu", coords: [-4.1685, -38.4630] as [number, number] },
];

// 🟩 BURITI (NOVAS PARADAS)
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

  // 🚍 localização do ônibus
  useEffect(() => {
    const onibusRef = ref(db, "onibus");

    return onValue(onibusRef, (snapshot) => {
      const data = snapshot.val();

      if (data?.lat && data?.lng) {
        setOrigemAtual([data.lat, data.lng]);
      }
    });
  }, []);

  // 📍 escolhe rota por bairro
  useEffect(() => {
    const rota = bairro === "Buriti"
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
        console.error("Sem API KEY");
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
        <p>Rastreamento em tempo real</p>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>

        {/* SELECT BAIRRO */}
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

        {/* LISTA DE PARADAS */}
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

        {/* BOTÃO MAPA (AGORA PARA OS DOIS BAIRROS) */}
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

        {/* MAPA (AGORA FUNCIONA NOS DOIS BAIRROS) */}
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