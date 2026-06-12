"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onValue, runTransaction } from "firebase/database";

import { auth, db } from "../firebase";

type Rota = "aldeiaPark" | "buriti";

export default function Motorista() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [rotas, setRotas] = useState<any>({});
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const rotasRef = ref(db, "rotas");

    const unsubscribe = onValue(rotasRef, (snapshot) => {
      const data = snapshot.val() || {};
      setRotas(data);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 INICIAR ROTA COM TRAVA (LOCK)
  async function iniciarViagem(rota: Rota) {
    if (!usuario) return;

    const rotaRef = ref(db, `rotas/${rota}`);

    try {
      await runTransaction(db, async (currentData) => {
        if (currentData?.val()?.status === "em_andamento") {
          throw new Error("Rota já está em andamento");
        }

        return {
          status: "em_andamento",
          motoristaId: usuario.uid,
          motoristaEmail: usuario.email,
          iniciadoEm: Date.now(),
        };
      }, rotaRef);

      // GPS tracking
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          await set(ref(db, `onibus/${rota}`), {
            lat,
            lng,
            atualizadoEm: Date.now(),
            motoristaId: usuario.uid,
          });
        },
        (error) => console.log(error),
        { enableHighAccuracy: true }
      );

      setWatchId(id);
    } catch (error: any) {
      alert(error.message || "Erro ao iniciar viagem");
    }
  }

  // 🛑 FINALIZAR ROTA (SÓ QUEM INICIOU)
  async function pararViagem(rota: Rota) {
    const rotaRef = ref(db, `rotas/${rota}`);

    const data = rotas?.[rota];

    if (!data) return;

    if (data.motoristaId !== usuario?.uid) {
      alert("Você não pode parar essa rota");
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    await set(rotaRef, {
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

        {/* 🚍 ROTAS */}
        <div style={{ marginTop: 30 }}>
          <h2>Rotas disponíveis</h2>

          {/* ALDEIA PARK */}
          <div
            style={{
              padding: 15,
              border: "1px solid #ddd",
              borderRadius: 12,
              marginBottom: 15,
            }}
          >
            <h3>🚌 Aldeia Park</h3>

            <p>
              Status:{" "}
              {rotas?.aldeiaPark?.status === "em_andamento"
                ? "🔴 Em andamento"
                : "🟢 Livre"}
            </p>

            {rotas?.aldeiaPark?.motoristaEmail && (
              <p>
                Motorista: {rotas.aldeiaPark.motoristaEmail}
              </p>
            )}

            <button
              onClick={() => iniciarViagem("aldeiaPark")}
              disabled={rotas?.aldeiaPark?.status === "em_andamento"}
              style={{
                padding: 12,
                marginRight: 10,
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Iniciar
            </button>

            <button
              onClick={() => pararViagem("aldeiaPark")}
              disabled={
                rotas?.aldeiaPark?.motoristaId !== usuario?.uid
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
              Parar
            </button>
          </div>

          {/* BURITI */}
          <div
            style={{
              padding: 15,
              border: "1px solid #ddd",
              borderRadius: 12,
            }}
          >
            <h3>🚌 Buriti</h3>

            <p>
              Status:{" "}
              {rotas?.buriti?.status === "em_andamento"
                ? "🔴 Em andamento"
                : "🟢 Livre"}
            </p>

            {rotas?.buriti?.motoristaEmail && (
              <p>
                Motorista: {rotas.buriti.motoristaEmail}
              </p>
            )}

            <button
              onClick={() => iniciarViagem("buriti")}
              disabled={rotas?.buriti?.status === "em_andamento"}
              style={{
                padding: 12,
                marginRight: 10,
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Iniciar
            </button>

            <button
              onClick={() => pararViagem("buriti")}
              disabled={
                rotas?.buriti?.motoristaId !== usuario?.uid
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
              Parar
            </button>
          </div>
        </div>

        {/* SAIR */}
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
            🚪 Sair
          </button>
        </div>
      </div>
    </div>
  );
}