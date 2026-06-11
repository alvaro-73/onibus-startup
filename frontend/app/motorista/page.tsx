"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onValue, update } from "firebase/database";

import { auth, db } from "../firebase";

export default function Motorista() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [iniciado, setIniciado] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // 📌 LOGIN
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 📡 ESCUTA STATUS DO PRÓPRIO MOTORISTA
  useEffect(() => {
    if (!usuario?.uid) return;

    const motoristaRef = ref(db, `onibus/${usuario.uid}`);

    const unsub = onValue(motoristaRef, (snap) => {
      const data = snap.val();
      setIniciado(!!data?.ativo);
    });

    return () => unsub();
  }, [usuario]);

  // ▶️ INICIAR VIAGEM
  async function iniciarViagem() {
    if (!usuario?.uid || iniciado) return;

    const motoristaRef = ref(db, `onibus/${usuario.uid}`);

    // cria registro único desse motorista
    await set(motoristaRef, {
      motorista: usuario.email,
      ativo: true,
      lat: 0,
      lng: 0,
      iniciadoEm: Date.now(),
    });

    // GPS ao vivo (ATUALIZA SEM SOBRESCREVER)
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        update(motoristaRef, {
          lat: latitude,
          lng: longitude,
          atualizadoEm: Date.now(),
        });
      },
      (err) => {
        console.error("Erro GPS:", err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    setWatchId(id);
  }

  // ⏹️ PARAR VIAGEM
  async function pararViagem() {
    if (!usuario?.uid) return;

    const motoristaRef = ref(db, `onibus/${usuario.uid}`);

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    await update(motoristaRef, {
      ativo: false,
    });

    setWatchId(null);
  }

  // 🚪 SAIR
  async function sair() {
    await signOut(auth);
    router.push("/");
  }

  if (loading) {
    return <h2 style={{ padding: 30 }}>Carregando...</h2>;
  }

  return (
    <div style={{ minHeight: "100vh", padding: 30, background: "#f3f4f6" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", background: "white", padding: 30, borderRadius: 20 }}>

        <h1>👨‍✈️ Motorista</h1>

        <p><strong>Email:</strong> {usuario?.email}</p>

        <div
          style={{
            marginTop: 20,
            padding: 15,
            borderRadius: 10,
            background: iniciado ? "#dcfce7" : "#fee2e2",
          }}
        >
          <strong>
            Status: {iniciado ? "🟢 Em viagem" : "🔴 Parado"}
          </strong>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          
          <button
            onClick={iniciarViagem}
            disabled={iniciado}
            style={{
              padding: 14,
              border: "none",
              borderRadius: 10,
              background: iniciado ? "#999" : "#22c55e",
              color: "white",
              cursor: iniciado ? "not-allowed" : "pointer",
            }}
          >
            ▶️ Iniciar viagem
          </button>

          <button
            onClick={pararViagem}
            disabled={!iniciado}
            style={{
              padding: 14,
              border: "none",
              borderRadius: 10,
              background: "#ef4444",
              color: "white",
              opacity: iniciado ? 1 : 0.5,
            }}
          >
            ⏹️ Parar
          </button>

          <button
            onClick={sair}
            style={{
              padding: 14,
              border: "none",
              borderRadius: 10,
              background: "#2563eb",
              color: "white",
            }}
          >
            🚪 Sair
          </button>
        </div>
      </div>
    </div>
  );
}