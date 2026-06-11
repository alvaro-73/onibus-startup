"use client";

import Link from "next/link";

export default function Login() {
  return (
    <div style={{
      fontFamily: "Arial",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f3f4f6"
    }}>
      
      <div style={{
        background: "white",
        padding: 30,
        borderRadius: 16,
        width: 350,
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
      }}>
        
        <h1 style={{ marginBottom: 10 }}>🔐 Login</h1>
        <p style={{ marginBottom: 20, color: "#666" }}>
          Escolha o tipo de acesso
        </p>

        <Link href="/aluno">
          <button style={{
            width: "100%",
            padding: 12,
            marginBottom: 10,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer"
          }}>
            Entrar como Aluno
          </button>
        </Link>

        <Link href="/motorista">
          <button style={{
            width: "100%",
            padding: 12,
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: "pointer"
          }}>
            Entrar como Motorista
          </button>
        </Link>
        
      </div>
    </div>
  );
}