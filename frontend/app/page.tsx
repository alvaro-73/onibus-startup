"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function entrar(tipo: "aluno" | "motorista") {
    try {
      setErro("");

      await signInWithEmailAndPassword(auth, email, senha);

      // depois do login, manda para a área certa
      if (tipo === "aluno") {
        router.push("/aluno");
      } else {
        router.push("/motorista");
      }
    } catch (err) {
      setErro("Email ou senha inválidos");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 420,
          background: "white",
          padding: 35,
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 40 }}>🚌 BusTrack</h1>

          <p style={{ color: "#666", marginTop: 10, marginBottom: 30 }}>
            Sistema de Transporte Escolar
          </p>
        </div>

        <h2 style={{ marginBottom: 20 }}>Entrar</h2>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        {/* SENHA */}
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={inputStyle}
        />

        {/* ERRO */}
        {erro && (
          <p style={{ color: "red", marginBottom: 10 }}>
            {erro}
          </p>
        )}

        {/* BOTÕES DE LOGIN */}
        <button
          onClick={() => entrar("aluno")}
          style={botaoAzul}
        >
          👨‍🎓 Entrar como Aluno
        </button>

        <button
          onClick={() => entrar("motorista")}
          style={botaoVerde}
        >
          👨‍✈️ Entrar como Motorista
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #ccc",
  fontSize: 16,
};

const botaoAzul = {
  width: "100%",
  padding: 14,
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 12,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
  marginBottom: 10,
};

const botaoVerde = {
  width: "100%",
  padding: 14,
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 12,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
};