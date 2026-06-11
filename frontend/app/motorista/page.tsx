"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, set, onValue } from "firebase/database";

import { auth, db } from "../firebase";

export default function Motorista() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [rotaAtiva, setRotaAtiva] = useState<"" | "Aldeia Park" | "Buriti">("");
  const [iniciado, setIniciado] = useState(false);

  const [watchId, setWatchId] = useState<number | null>(null);

  // 🔐 LOGIN
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 📡 STATUS DO MOTORISTA (PRÓPRIO USUÁRIO)
  useEffect(() => {
    if (!usuario?.uid) return;

    const refMotorista = ref(db, `onibus/${usuario.uid}`);

    const unsub = onValue(refMotorista, (snapshot) => {
      const data = snapshot.val();

      if (data?.ativo) {
        setIniciado(true);
        setRotaAtiva(data.rota);
      } else {
        setIniciado(false);
        setRotaAtiva("");
      }
    });

    return () => unsub();
  }, [usuario]);

  // ▶️ INICIAR VIAGEM
  async function iniciarViagem(rota: "Aldeia Park" | "Buriti") {
    if (!usuario?.uid || iniciado) return;

    const refMotorista = ref(db, `onibus/${usuario.uid}`);

    await set(refMotorista, {
      rota,
      motorista: usuario.email,
      ativo: true,
      lat: null,
      lng: null,
      iniciadoEm: Date.now(),
    });

    const id = navigator.geolocation.watchPosition(async (pos) => {
      await set(ref(db, `onibus/${usuario.uid}`), {
        rota,
        motorista: usuario.email,
        ativo: true,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        atualizadoEm: Date.now(),
      });
    });

    setWatchId(id);
  }

  // ⏹️ PARAR VIAGEM
  async function pararViagem() {
    if (!usuario?.uid) return;

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    await set(ref(db, `onibus/${usuario.uid}`), {
      rota: "",
      motorista: usuario.email,
      ativo: false,
      lat: null,
      lng: null,
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
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 30 }}>
      <div style={{ maxWidth: 700, margin: "0 auto", background: "white", padding: 30, borderRadius: 20 }}>

        <h1>👨‍✈️ Área do Motorista</h1>

        <p><strong>Email:</strong> {usuario?.email}</p>

        <div
          style={{
            marginTop: 20,
            padding: 15,
            borderRadius: 12,
            background: iniciado ? "#dcfce7" : "#fee2e2",
          }}
        >
          <strong>
            Status: {iniciado ? "🟢 Em viagem" : "🔴 Parado"}
          </strong>
        </div>

        {iniciado && (
          <p style={{ marginTop: 10 }}>
            🚏 Rota atual: <strong>{rotaAtiva}</strong>
          </p>
        )}

        {/* BOTÕES */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>

          <button
            onClick={() => iniciarViagem("Aldeia Park")}
            disabled={iniciado}
            style={botao("#22c55e", iniciado)}
          >
            ▶️ Aldeia Park
          </button>

          <button
            onClick={() => iniciarViagem("Buriti")}
            disabled={iniciado}
            style={botao("#16a34a", iniciado)}
          >
            ▶️ Buriti
          </button>

          <button
            onClick={pararViagem}
            disabled={!iniciado}
            style={botao("#ef4444", !iniciado)}
          >
            ⏹️ Parar
          </button>

          <button onClick={sair} style={botao("#2563eb", false)}>
            🚪 Sair
          </button>

        </div>
      </div>
    </div>
  );
}

// 🎨 estilo botão
function botao(color: string, disabled: boolean): React.CSSProperties {
  return {
    padding: "14px 20px",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    background: color,
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}