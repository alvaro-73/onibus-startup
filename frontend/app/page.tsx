"use client";

import Link from "next/link";

export default function Login() {
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
          <h1
            style={{
              margin: 0,
              fontSize: 40,
            }}
          >
            🚌 BusTrack
          </h1>

          <p
            style={{
              color: "#666",
              marginTop: 10,
              marginBottom: 30,
            }}
          >
            Sistema de Transporte Escolar
          </p>
        </div>

        <h2
          style={{
            marginBottom: 20,
            color: "#111827",
          }}
        >
          Bem-vindo
        </h2>

        <p
          style={{
            color: "#6b7280",
            marginBottom: 25,
          }}
        >
          Escolha como deseja acessar o sistema.
        </p>

        <Link href="/aluno">
          <button
            style={{
              width: "100%",
              padding: 15,
              marginBottom: 12,
              border: "none",
              borderRadius: 12,
              background: "#2563eb",
              color: "white",
              fontSize: 16,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            👨‍🎓 Entrar como Aluno
          </button>
        </Link>

        <Link href="/cadastro">
          <button
            style={{
              width: "100%",
              padding: 15,
              marginBottom: 12,
              border: "none",
              borderRadius: 12,
              background: "#0ea5e9",
              color: "white",
              fontSize: 16,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            📝 Criar Conta
          </button>
        </Link>

        <Link href="/motorista">
          <button
            style={{
              width: "100%",
              padding: 15,
              border: "none",
              borderRadius: 12,
              background: "#16a34a",
              color: "white",
              fontSize: 16,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            👨‍✈️ Área do Motorista
          </button>
        </Link>

        <div
          style={{
            marginTop: 25,
            paddingTop: 20,
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          Startup Ônibus • Rastreamento em tempo real
        </div>
      </div>
    </div>
  );
}