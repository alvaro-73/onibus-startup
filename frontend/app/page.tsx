"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";

import { auth, db } from "./firebase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar() {
    try {
      setErro("");
      setLoading(true);

      // 1. login no Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email, senha);

      const uid = cred.user.uid;

      // 2. buscar tipo do usuário no Realtime Database
      const snapshot = await get(ref(db, `usuarios/${uid}`));

      const dados = snapshot.val();

      if (!dados) {
        setErro("Usuário não encontrado no banco de dados");
        setLoading(false);
        return;
      }

      // 3. redirecionamento automático baseado no tipo
      if (dados.tipo === "aluno") {
        router.push("/aluno");
      } else if (dados.tipo === "motorista") {
        router.push("/motorista");
      } else {
        setErro("Tipo de usuário inválido");
      }

    } catch (error) {
      setErro("Email ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={container}>
      <div style={card}>
        <h1>🚌 BusTrack</h1>
        <p>Sistema de Transporte Escolar</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={input}
        />

        {erro && <p style={{ color: "red" }}>{erro}</p>}

        <button onClick={entrar} style={button} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}

/* =========================
   ESTILOS
========================= */

const container = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  fontFamily: "Arial",
};

const card = {
  background: "white",
  padding: 30,
  borderRadius: 18,
  width: 420,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  textAlign: "center" as const,
};

const input = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #ccc",
  fontSize: 16,
};

const button = {
  width: "100%",
  padding: 14,
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 12,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
};