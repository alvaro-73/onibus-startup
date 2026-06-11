"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

      const cred = await signInWithEmailAndPassword(auth, email, senha);

      const uid = cred.user.uid;

      const snapshot = await get(ref(db, `usuarios/${uid}`));
      const dados = snapshot.val();

      if (!dados) {
        setErro("Usuário não encontrado");
        return;
      }

      if (dados.tipo === "aluno") {
        router.push("/aluno");
      } else if (dados.tipo === "motorista") {
        router.push("/motorista");
      } else {
        setErro("Tipo inválido");
      }

    } catch (err) {
      setErro("Email ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={container}>
      <div style={card}>
        <h1>🚌 FluxBus</h1>
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

        <button onClick={entrar} style={button}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* 👇 BOTÃO DE CADASTRO */}
        <Link href="/cadastro">
          <button style={cadastroBtn}>
            Criar conta
          </button>
        </Link>
      </div>
    </div>
  );
}

/* estilos */
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
  textAlign: "center" as const,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const input = {
  width: "100%",
  padding: 14,
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #ccc",
};

const button = {
  width: "100%",
  padding: 14,
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 12,
  fontWeight: "bold",
  cursor: "pointer",
};

const cadastroBtn = {
  width: "100%",
  padding: 14,
  marginTop: 10,
  background: "#0ea5e9",
  color: "white",
  border: "none",
  borderRadius: 12,
  fontWeight: "bold",
  cursor: "pointer",
};