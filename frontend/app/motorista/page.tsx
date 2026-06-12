"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onValue } from "firebase/database";

import { auth, db } from "../firebase";

type Rota = "aldeiaPark" | "buriti";

export default function Motorista() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [rotas, setRotas] = useState<any>({});
  const [watchId, setWatchId] = useState<number | null>(null);

  // 🔐 AUTH
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  // 📡 LISTA ROTAS EM TEMPO REAL
  useEffect(() => {
    const rotasRef = ref(db, "viagens");

    const unsub = onValue(rotasRef, (snapshot) => {
      setRotas(snapshot.val() || {});
    });

    return () => unsub();
  }, []);

  // 🚀 INICIAR VIAGEM
  async function iniciarViagem(rota: Rota) {
    const atual = rotas?.[rota];

    // 🚫 bloqueio de conflito
    if (atual?.status === "em_andamento") {
      alert("Essa rota já está em andamento");
      return;
    }

    await set(ref(db, `viagens/${rota}`), {
      status: "em_andamento",
      motoristaId: usuario?.uid,
      motoristaEmail: usuario?.email,
      iniciadoEm: Date.now(),
    });

    // 📍 GPS em tempo real por rota
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        await set(ref(db, `onibus/${rota}`), {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          atualizadoEm: Date.now(),
          motoristaId: usuario?.uid,
        });
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );

    setWatchId(id);
  }

  // 🛑 PARAR VIAGEM
  async function pararViagem(rota: Rota) {
    const atual = rotas?.[rota];

    // 🔒 só quem iniciou pode parar
    if (atual?.motoristaId !== usuario?.uid) {
      alert("Você não pode parar essa rota");
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    await set(ref(db, `viagens/${rota}`), {
      status: "livre",
      motoristaId: null,
      motoristaEmail: null,
      iniciadoEm: null,
    });
  }

  async function sair() {
    await signOut(auth);
    router.push("/");
  }

  if (loadingAuth) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Carregando...</h2>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: 30,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          background: "white",
          padding: 30,
          borderRadius: 20,
        }}
      >
        <h1>👨‍✈️ Área do Motorista</h1>

        <p>
          <strong>Logado:</strong> {usuario?.email}
        </p>

        {/* 🔥 ROTAS */}
        {(["aldeiaPark", "buriti"] as Rota[]).map((rota) => (
          <div
            key={rota}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 15,
              marginTop: 20,
            }}
          >
            <h3>🚌 {rota}</h3>

            <p>
              Status:{" "}
              {rotas?.[rota]?.status === "em_andamento"
                ? "🔴 Em andamento"
                : "🟢 Livre"}
            </p>

            <p>
              Motorista:{" "}
              {rotas?.[rota]?.motoristaEmail || "-"}
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => iniciarViagem(rota)}
                disabled={rotas?.[rota]?.status === "em_andamento"}
                style={{
                  padding: 12,
                  background: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                ▶️ Iniciar
              </button>

              <button
                onClick={() => pararViagem(rota)}
                disabled={
                  rotas?.[rota]?.motoristaId !== usuario?.uid
                }
                style={{
                  padding: 12,
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                ⏹️ Parar
              </button>
            </div>
          </div>
        ))}

        {/* 🚪 SAIR */}
        <div style={{ marginTop: 30 }}>
          <button
            onClick={sair}
            style={{
              padding: 12,
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 10,
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}