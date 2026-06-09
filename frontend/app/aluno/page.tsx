"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

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

const paradasAldeiaPark = [
  { nome: "Smartfit", coords: [-4.1816, -38.4593] as [number, number] },
  { nome: "Sabor Divino", coords: [-4.1803, -38.4594] as [number, number] },
  { nome: "Dione", coords: [-4.1831, -38.4674] as [number, number] },
  { nome: "Coriolano", coords: [-4.1732, -38.4611] as [number, number] },
  { nome: "Liceu", coords: [-4.1685, -38.4630] as [number, number] },
];

export default function Home() {
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [bairro, setBairro] = useState("Aldeia Park");

  const [origemAtual, setOrigemAtual] =
    useState<[number, number]>(origemPadrao);

  useEffect(() => {
    const onibusRef = ref(db, "onibus");

    const unsubscribe = onValue(onibusRef, (snapshot) => {
      const data = snapshot.val();

      if (data?.lat && data?.lng) {
        setOrigemAtual([data.lat, data.lng]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (bairro !== "Aldeia Park") {
      setParadas([]);
      setCarregando(false);
      return;
    }

    async function calcularRotas() {
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
        for (const parada of paradasAldeiaPark) {
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

    calcularRotas();
  }, [origemAtual, bairro]);

 return (
  <div
    style={{
      fontFamily: "Arial, sans-serif",
      minHeight: "100vh",
      background: "#eef4ff",
    }}
  >
    <header
      style={{
        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
        color: "white",
        padding: "30px 20px",
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 30,
          fontWeight: "bold",
        }}
      >
        🚌 Transporte Escolar
      </h1>

      <p
        style={{
          marginTop: 8,
          opacity: 0.9,
          fontSize: 15,
        }}
      >
        Acompanhe seu ônibus em tempo real
      </p>
    </header>

    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 20,
          marginTop: -10,
          marginBottom: 20,
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#22c55e",
            }}
          />

          <strong>Ônibus em rota</strong>
        </div>

        <p
          style={{
            marginTop: 10,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          Localização atualizada automaticamente pelo motorista.
        </p>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >
        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginBottom: 10,
            color: "#334155",
          }}
        >
          Bairro
        </label>

        <select
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            fontSize: 15,
          }}
        >
          <option value="Aldeia Park">Aldeia Park</option>
          <option value="Buriti">Buriti</option>
        </select>
      </div>

      <div style={{ marginTop: 20 }}>
        {bairro === "Buriti" ? (
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 20,
              textAlign: "center",
              boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            }}
          >
            Nenhuma parada cadastrada para este bairro.
          </div>
        ) : carregando ? (
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 20,
              textAlign: "center",
              boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
            }}
          >
            ⏳ Calculando rotas...
          </div>
        ) : (
          paradas.map((p, i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: 18,
                padding: 18,
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 18,
                    color: "#1e293b",
                  }}
                >
                  {p.nome}
                </div>

                <div
                  style={{
                    color: "#64748b",
                    marginTop: 5,
                    fontSize: 14,
                  }}
                >
                  Distância: {p.distancia}
                </div>
              </div>

              <div
                style={{
                  background: "#22c55e",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 999,
                  fontWeight: "bold",
                  minWidth: 80,
                  textAlign: "center",
                }}
              >
                {p.tempo}
              </div>
            </div>
          ))
        )}
      </div>

      {bairro === "Aldeia Park" && (
        <>
          <button
            onClick={() => setMostrarMapa(!mostrarMapa)}
            style={{
              width: "100%",
              marginTop: 20,
              padding: 18,
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 16,
              fontSize: 16,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37,99,235,0.35)",
            }}
          >
            {mostrarMapa
              ? "✖ Fechar mapa"
              : "🗺 Ver mapa em tempo real"}
          </button>

          {mostrarMapa && (
            <div
              style={{
                marginTop: 20,
                background: "white",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
            >
              <MapComponent
                origem={origemAtual}
                paradas={
                  paradas.length
                    ? paradas
                    : paradasAldeiaPark
                }
              />
            </div>
          )}
        </>
      )}
    </main>
  </div>
);
}