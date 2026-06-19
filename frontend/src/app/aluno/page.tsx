"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set } from "firebase/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { ROTAS, getBairrosUnicos, getRotaPorBairro } from "@/data/rotas";

/* 📍 Haversine (distância em km) */
function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MotoristaPage() {
  const router = useRouter();
  const bairros = useMemo(() => getBairrosUnicos(), []);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [bairro, setBairro] = useState(bairros[0] ?? "");

  const rota = useMemo(
    () => getRotaPorBairro(bairro) ?? ROTAS[0],
    [bairro]
  );

  const [viagemAtiva, setViagemAtiva] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const [posicao, setPosicao] = useState({ lat: 0, lng: 0 });
  const [velocidadeAtual, setVelocidadeAtual] = useState(0);

  const [etaTotal, setEtaTotal] = useState(0);
  const [statusIA, setStatusIA] = useState("Aguardando...");

  /* 🔐 auth */
  useEffect(() => {
    if (!firebaseConfigured) return;

    const unsub = onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      if (!u) router.push("/login?next=/motorista");
    });

    return () => unsub();
  }, [router]);

  /* 🚀 cálculo ETA em tempo real */
  function calcularETA(lat: number, lng: number) {
    let distanciaTotal = 0;

    for (const parada of rota.paradas) {
      const dist = calcularDistancia(
        lat,
        lng,
        parada.coords[0],
        parada.coords[1]
      );

      distanciaTotal += dist;
    }

    const velocidadeKmH = Math.max(velocidadeAtual, 10); // evita divisão por zero
    const etaMin = (distanciaTotal / velocidadeKmH) * 60;

    setEtaTotal(etaMin);
  }

  /* 🤖 IA (mantida simples, igual seu sistema antigo) */
  async function verificarDesvioIA(lat: number, lng: number) {
    try {
      const resp = await fetch(
        process.env.NEXT_PUBLIC_IA_ENDPOINT ||
          "https://startup-onibus-ia1.onrender.com/prever",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        }
      );

      const data = await resp.json();
      setStatusIA(data.alerta ? "🚨 Desvio detectado" : "✅ OK");
    } catch {
      setStatusIA("⚠️ IA offline");
    }
  }

  /* ▶️ iniciar viagem */
  function iniciarViagem() {
    if (viagemAtiva) return;

    setViagemAtiva(true);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = pos.coords.speed ?? 0;
        const speedKmH = speed * 3.6;

        setPosicao({ lat, lng });
        setVelocidadeAtual(speedKmH);

        /* ETA recalculado em tempo real */
        calcularETA(lat, lng);

        await verificarDesvioIA(lat, lng);

        await set(ref(db, `onibus/${rota.id}`), {
          lat,
          lng,
          speedKmH,
          etaMin: etaTotal,
          motorista: usuario?.email ?? "",
        });
      },
      (err) => console.error(err),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    setWatchId(id);
  }

  function pararViagem() {
    setViagemAtiva(false);

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Motorista</h1>

      <p className="text-sm mb-4">ETA total: {etaTotal.toFixed(0)} min</p>

      <select
        value={bairro}
        disabled={viagemAtiva}
        onChange={(e) => setBairro(e.target.value)}
        className="border p-2 w-full mb-4"
      >
        {bairros.map((b) => (
          <option key={b}>{b}</option>
        ))}
      </select>

      <button
        onClick={viagemAtiva ? pararViagem : iniciarViagem}
        className={`w-full p-3 text-white rounded ${
          viagemAtiva ? "bg-red-600" : "bg-blue-600"
        }`}
      >
        {viagemAtiva ? "Parar" : "Iniciar"}
      </button>

      <div className="mt-4 p-4 border rounded">
        <p>Velocidade: {velocidadeAtual.toFixed(1)} km/h</p>
        <p>Lat: {posicao.lat}</p>
        <p>Lng: {posicao.lng}</p>
        <p>IA: {statusIA}</p>
      </div>
    </div>
  );
}