"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar() {
    try {
      setErro("");
      setLoading(true);

      if (!auth || !db) {
        setErro("Firebase não inicializado");
        return;
      }

      const cred = await signInWithEmailAndPassword(auth, email, senha);

      const snap = await get(ref(db, `usuarios/${cred.user.uid}`));
      const dados = snap.val();

      document.cookie = `fluxbus_auth=${cred.user.uid}; path=/; max-age=2592000`;

      if (dados?.tipo === "motorista") {
        router.push("/motorista");
      } else if (dados?.tipo === "aluno") {
        router.push("/aluno");
      } else {
        router.push("/");
      }
    } catch (err) {
      setErro("Email ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to right, #2563eb, #1d4ed8)",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: 420,
          background: "white",
          padding: 40,
          borderRadius: 28,
          boxShadow: "0 0 30px rgba(0,0,0,0.2)",
        }}
      >
        <h1 style={{ textAlign: "center", fontSize: 34 }}>
          🚌 Fluxbus
        </h1>

        <p style={{ textAlign: "center", color: "#666", marginBottom: 25 }}>
          Sistema de Transporte Escolar
        </p>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={inputStyle}
        />

        {erro && (
          <p style={{ color: "red", fontSize: 14 }}>{erro}</p>
        )}

        <button
          onClick={entrar}
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: 15,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #ccc",
  fontSize: 16,
} as const;

const buttonStyle = {
  width: "100%",
  padding: 15,
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
  cursor: "pointer",
};