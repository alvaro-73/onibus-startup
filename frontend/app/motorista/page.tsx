"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onValue } from "firebase/database";
import { auth, db } from "../firebase";

export default function Motorista() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [rotaAtiva, setRotaAtiva] = useState<"Aldeia Park" | "Buriti" | "">("");
  const [iniciado, setIniciado] = useState(false);

  const [watchId, setWatchId] = useState<number | null>(null);

  // 🔐 auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  // 📡 status viagem geral
  useEffect(() => {
    const viagemRef = ref(db, "viagem");

    const unsub = onValue(viagemRef, (snapshot) => {
      const data = snapshot.val();

      if (data?.ativa) {
        setIniciado(true);
        setRotaAtiva(data.rota || "");
      } else {
        setIniciado(false);
        setRotaAtiva("");
      }
    });

    return () => unsub();
  }, []);

  // ▶️ iniciar viagem por rota
  async function iniciarViagem(rota: "Aldeia Park" | "Buriti") {
    if (iniciado) return;

    await set(ref(db, "viagem"), {
      ativa: true,
      rota,
      motorista: usuario?.email || "Motorista",
      iniciadoEm: Date.now(),
    });

    const id = navigator.geolocation.watchPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 🔥 SEPARADO POR ROTA
      const caminho = rota === "Aldeia Park" ? "onibus/aldeiaPark" : "onibus/buriti";

      await set(ref(db, caminho), {
        lat,
        lng,
        atualizadoEm: Date.now(),
      });
    });

    setWatchId(id);
  }

  // ⏹️ parar viagem
  async function pararViagem() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    await set(ref(db, "viagem"), {
      ativa: false,
      rota: "",
      motorista: "",
      iniciadoEm: null,
    });

    setWatchId(null);
  }

  // 🚪 sair
  async function sair() {
    await signOut(auth);
    router.push("/");
  }

  if (loadingAuth) {
    return <h2 style={{ padding: 30 }}>Carregando...</h2>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 30 }}>
      <div style={{ maxWidth: 700, margin: "0 auto", background: "white", padding: 30, borderRadius: 20 }}>

        <h1>👨‍✈️ Área do Motorista</h1>

        <p><strong>Email:</strong> {usuario?.email}</p>

        <div
          style={{
            padding: 15,
            borderRadius: 10,
            background: iniciado ? "#dcfce7" : "#fee2e2",
          }}
        >
          <strong>
            Status: {iniciado ? "🟢 Em viagem" : "🔴 Parado"}
          </strong>
        </div>

        {iniciado && (
          <p style={{ marginTop: 10 }}>
            🚏 Rota ativa: <strong>{rotaAtiva}</strong>
          </p>
        )}

        {/* BOTÕES ROTAS */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>

          <button
            onClick={() => iniciarViagem("Aldeia Park")}
            disabled={iniciado}
            style={botao("#22c55e", iniciado)}
          >
            ▶️ Iniciar Aldeia Park
          </button>

          <button
            onClick={() => iniciarViagem("Buriti")}
            disabled={iniciado}
            style={botao("#16a34a", iniciado)}
          >
            ▶️ Iniciar Buriti
          </button>

          <button
            onClick={pararViagem}
            disabled={!iniciado}
            style={botao("#ef4444", !iniciado)}
          >
            ⏹️ Parar viagem
          </button>

          <button onClick={sair} style={botao("#2563eb", false)}>
            🚪 Sair
          </button>

        </div>
      </div>
    </div>
  );
}

// 🎨 helper de estilo
function botao(color: string, disabled: boolean) {
  return {
    padding: "14px 20px",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    background: color,
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  } as React.CSSProperties;
}