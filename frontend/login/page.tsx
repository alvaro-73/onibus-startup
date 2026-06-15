"use client";

import { useRouter } from "next/navigation";

import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [isLogin, setIsLogin] =
    useState(true);

  return (
    <main
      style={{
        width: "100vw",

        height: "100vh",

        display: "flex",

        justifyContent: "center",

        alignItems: "center",

        background:
          "linear-gradient(to right, #2563eb, #1d4ed8)",

        fontFamily: "Arial",
      }}
    >
      {/* CARD */}

      <div
        style={{
          width: 430,

          background: "white",

          borderRadius: 28,

          padding: 40,

          boxShadow:
            "0 0 30px rgba(0,0,0,0.2)",
        }}
      >
        {/* LOGO */}

        <h1
          style={{
            textAlign: "center",

            fontSize: 38,

            marginBottom: 10,
          }}
        >
          🚌 BusTrack
        </h1>

        <p
          style={{
            textAlign: "center",

            color: "#666",

            fontSize: 18,

            marginBottom: 35,
          }}
        >
          Sistema de Transporte Escolar
        </p>

        {/* TÍTULO */}

        <h2
          style={{
            fontSize: 30,

            marginBottom: 30,
          }}
        >
          {isLogin
            ? "Entrar"
            : "Criar Conta"}
        </h2>

        {/* NOME */}

        {!isLogin && (
          <input
            type="text"
            placeholder="Nome completo"
            style={inputStyle}
          />
        )}

        {/* EMAIL */}

        <input
          type="email"
          placeholder="Email"
          style={inputStyle}
        />

        {/* SENHA */}

        <input
          type="password"
          placeholder="Senha"
          style={inputStyle}
        />

        {/* CONFIRMAR SENHA */}

        {!isLogin && (
          <input
            type="password"
            placeholder="Confirmar senha"
            style={inputStyle}
          />
        )}

        {/* BOTÃO */}

        <button
          onClick={() =>
            router.push("/")
          }
          style={{
            width: "100%",

            padding: 17,

            border: "none",

            borderRadius: 16,

            background: "#2563eb",

            color: "white",

            fontSize: 20,

            fontWeight: "bold",

            cursor: "pointer",

            marginTop: 10,
          }}
        >
          {isLogin
            ? "Entrar"
            : "Cadastrar"}
        </button>

        {/* TROCAR LOGIN */}

        <p
          style={{
            textAlign: "center",

            marginTop: 28,

            fontSize: 17,

            color: "#444",
          }}
        >
          {isLogin
            ? "Não possui conta?"
            : "Já possui conta?"}
        </p>

        <button
          onClick={() =>
            setIsLogin(!isLogin)
          }
          style={{
            width: "100%",

            padding: 15,

            borderRadius: 16,

            border:
              "2px solid #2563eb",

            background: "white",

            color: "#2563eb",

            fontSize: 18,

            fontWeight: "bold",

            cursor: "pointer",

            marginTop: 10,
          }}
        >
          {isLogin
            ? "Criar conta"
            : "Voltar para login"}
        </button>
      </div>
    </main>
  );
}

/* ========================================
   ESTILO INPUTS
======================================== */

const inputStyle = {
  width: "100%",

  padding: 17,

  marginBottom: 18,

  borderRadius: 16,

  border: "1px solid #d1d5db",

  fontSize: 18,

  outline: "none",
} as const;