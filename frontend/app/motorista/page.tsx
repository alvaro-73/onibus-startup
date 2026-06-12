"use client";

import { useEffect, useState } from "react";
import { ref, set, onValue } from "firebase/database";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

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
  const [usuario, setUsuario] = useState<any>(null);

  const [rotaSelecionada, setRotaSelecionada] =
    useState<Rota>("aldeiaPark");

  const [viagemAtiva, setViagemAtiva] = useState(false);

  const [watchId, setWatchId] = useState<number | null>(null);

  const [posicao, setPosicao] = useState({ lat: 0, lng: 0 });

  const [alerta, setAlerta] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  const rotaAtual =
    rotaSelecionada === "buriti"
      ? paradasBuriti
      : paradasAldeiaPark;

  // 🔐 AUTH
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
    });

    return () => unsub();
  }, []);

  // 🧠 DISTÂNCIA
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

  function verificarDesvio(lat: number, lng: number) {
    const dist = distanciaDaRota({ lat, lng }, rotaAtual);

    if (dist > 0.5) {
      setAlerta(true);
    } else {
      setAlerta(false);
      setJustificativa("");
    }
  }

  // 🚀 INICIAR VIAGEM
  function iniciarViagem() {
    if (viagemAtiva) return;

    setViagemAtiva(true);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const now = Date.now();

        setPosicao({ lat, lng });

        verificarDesvio(lat, lng);

        // 🚍 posição atual
        await set(ref(db, `onibus/${rotaSelecionada}`), {
          lat,
          lng,
          atualizadoEm: now,
          motoristaId: usuario?.uid,
        });

        // 📜 histórico (IA)
        await set(ref(db, `historico/${rotaSelecionada}/${now}`), {
          lat,
          lng,
          timestamp: now,
        });
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );

    setWatchId(id);
  }

  // 🛑 PARAR VIAGEM
  function pararViagem() {
    setViagemAtiva(false);

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }

  // 💾 JUSTIFICATIVA
  async function enviarJustificativa() {
    if (!justificativa) return;

    await set(
      ref(db, `justificativas/${rotaSelecionada}/${Date.now()}`),
      {
        texto: justificativa,
        posicao,
        motoristaId: usuario?.uid,
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

      <p>Logado: {usuario?.email}</p>

      {/* ROTA */}
      <select
        value={rotaSelecionada}
        onChange={(e) =>
          setRotaSelecionada(e.target.value as Rota)
        }
        disabled={viagemAtiva}
      >
        <option value="aldeiaPark">Aldeia Park</option>
        <option value="buriti">Buriti</option>
      </select>

      {/* BOTÕES */}
      <div style={{ marginTop: 15, display: "flex", gap: 10 }}>

        <button
          onClick={iniciarViagem}
          disabled={viagemAtiva}
          style={{
            padding: 12,
            background: "green",
            color: "white",
            border: "none",
            borderRadius: 8,
          }}
        >
          ▶️ Iniciar viagem
        </button>

        <button
          onClick={pararViagem}
          disabled={!viagemAtiva}
          style={{
            padding: 12,
            background: "red",
            color: "white",
            border: "none",
            borderRadius: 8,
          }}
        >
          ⏹️ Parar viagem
        </button>
      </div>

      {/* POSIÇÃO */}
      <div style={{
        marginTop: 15,
        padding: 10,
        background: "#111",
        color: "white",
        borderRadius: 10
      }}>
        <p>📍 {posicao.lat.toFixed(6)} | {posicao.lng.toFixed(6)}</p>
      </div>

      {/* ALERTA */}
      {alerta && (
        <div style={{
          marginTop: 15,
          padding: 15,
          background: "red",
          color: "white",
          borderRadius: 10
        }}>
          <p>🚨 Você saiu da rota!</p>

          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            style={{ width: "100%", height: 80 }}
            placeholder="Justifique o desvio..."
          />

          <button
            onClick={enviarJustificativa}
            style={{
              marginTop: 10,
              padding: 10,
              background: "black",
              color: "white",
              borderRadius: 8,
              border: "none"
            }}
          >
            Enviar justificativa
          </button>
        </div>
      )}

    </div>
  );
}