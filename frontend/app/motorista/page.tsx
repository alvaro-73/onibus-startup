"use client";

import { useEffect, useState } from "react";
import { ref, set, onValue } from "firebase/database";
import { db } from "../firebase";

type Rota = "aldeiaPark" | "buriti";

type Parada = {
  nome: string;
  coords: [number, number];
};

const paradasAldeiaPark: Parada[] = [
  { nome: "Smartfit", coords: [-4.1816, -38.4593] },
  { nome: "Sabor Divino", coords: [-4.1803, -38.4594] },
  { nome: "Dione", coords: [-4.1831, -38.4674] },
  { nome: "Coriolano", coords: [-4.1732, -38.4611] },
  { nome: "Liceu", coords: [-4.1685, -38.4630] },
];

const paradasBuriti: Parada[] = [
  { nome: "Madeireira Roma", coords: [-4.1769, -38.4815] },
  { nome: "Marina", coords: [-4.1755, -38.4729] },
  { nome: "MCR Lubrificantes", coords: [-4.1769, -38.4785] },
  { nome: "Municipal", coords: [-4.1752, -38.4686] },
  { nome: "Liceu", coords: [-4.1685, -38.4630] },
];

export default function Motorista() {
  const [rotaSelecionada, setRotaSelecionada] = useState<Rota>("aldeiaPark");

  const [alerta, setAlerta] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  const [posicao, setPosicao] = useState({ lat: 0, lng: 0 });

  const rotaAtual =
    rotaSelecionada === "buriti"
      ? paradasBuriti
      : paradasAldeiaPark;

  // 🚍 GPS + DETECÇÃO DE ROTA
  useEffect(() => {
    if (typeof window === "undefined") return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setPosicao({ lat, lng });

        verificarDesvio(lat, lng);

        // 🚍 posição atual
        set(ref(db, `onibus/${rotaSelecionada}`), {
          lat,
          lng,
          atualizadoEm: Date.now(),
        });
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [rotaSelecionada]);

  // 🧠 DISTÂNCIA ENTRE DOIS PONTOS
  function distancia(a: any, b: any) {
    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) *
        Math.cos(toRad(b.lat)) *
        Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  // 📍 distância até rota
  function distanciaDaRota(pos: any, rota: Parada[]) {
    let menor = Infinity;

    for (const parada of rota) {
      const d = distancia(pos, {
        lat: parada.coords[0],
        lng: parada.coords[1],
      });

      if (d < menor) menor = d;
    }

    return menor;
  }

  // 🚨 IA DE DESVIO
  function verificarDesvio(lat: number, lng: number) {
    const dist = distanciaDaRota({ lat, lng }, rotaAtual);

    if (dist > 0.5) {
      setAlerta(true);
    } else {
      setAlerta(false);
      setJustificativa("");
    }
  }

  // 💾 SALVAR JUSTIFICATIVA
  async function enviarJustificativa() {
    if (!justificativa) return;

    await set(
      ref(db, `justificativas/${rotaSelecionada}/${Date.now()}`),
      {
        texto: justificativa,
        motoristaId: "motorista_atual",
        posicao,
        criadoEm: Date.now(),
      }
    );

    alert("Justificativa enviada!");
    setAlerta(false);
    setJustificativa("");
  }

  return (
    <div style={{ fontFamily: "Arial", padding: 20 }}>

      <h1>👨‍✈️ Motorista</h1>

      {/* SELEÇÃO DE ROTA */}
      <select
        value={rotaSelecionada}
        onChange={(e) => setRotaSelecionada(e.target.value as Rota)}
      >
        <option value="aldeiaPark">Aldeia Park</option>
        <option value="buriti">Buriti</option>
      </select>

      {/* POSIÇÃO */}
      <div style={{
        marginTop: 15,
        padding: 10,
        background: "#111",
        color: "white",
        borderRadius: 10
      }}>
        <p>📍 Lat: {posicao.lat}</p>
        <p>📍 Lng: {posicao.lng}</p>
      </div>

      {/* 🚨 ALERTA DE DESVIO */}
      {alerta && (
        <div style={{
          marginTop: 15,
          padding: 15,
          background: "red",
          color: "white",
          borderRadius: 10
        }}>
          <p>🚨 Você saiu da rota!</p>

          <p>Justifique o motivo:</p>

          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            style={{
              width: "100%",
              height: 80,
              marginTop: 10
            }}
          />

          <button
            onClick={enviarJustificativa}
            style={{
              marginTop: 10,
              padding: 10,
              background: "black",
              color: "white",
              border: "none",
              borderRadius: 8
            }}
          >
            Enviar justificativa
          </button>
        </div>
      )}

    </div>
  );
}