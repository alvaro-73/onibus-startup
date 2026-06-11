"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  ref,
  get,
} from "firebase/database";

import {
  auth,
  db,
} from "./firebase";

import Link from "next/link";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [senha, setSenha] =
    useState("");

  const [erro, setErro] =
    useState("");

  async function entrar() {
    try {
      setErro("");

      const credencial =
        await signInWithEmailAndPassword(
          auth,
          email,
          senha
        );

      const uid =
        credencial.user.uid;

      const snapshot =
        await get(
          ref(
            db,
            `usuarios/${uid}`
          )
        );

      const dados =
        snapshot.val();

      if (
        dados?.tipo ===
        "motorista"
      ) {
        router.push(
          "/motorista"
        );
      } else {
        router.push(
          "/aluno"
        );
      }
    } catch (error) {
      setErro(
        "Email ou senha inválidos"
      );
    }
  }

  return (
    <div
      style={{
        fontFamily: "Arial",
        minHeight: "100vh",
        display: "flex",
        justifyContent:
          "center",
        alignItems: "center",
        background:
          "#f3f4f6",
      }}
    >
      <div
        style={{
          background:
            "white",
          padding: 30,
          borderRadius: 16,
          width: 400,
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h1>
          🚌 BusTrack
        </h1>

        <p>
          Faça login para
          continuar
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) =>
            setSenha(
              e.target.value
            )
          }
          style={inputStyle}
        />

        {erro && (
          <p
            style={{
              color: "red",
            }}
          >
            {erro}
          </p>
        )}

        <button
          onClick={entrar}
          style={botaoAzul}
        >
          Entrar
        </button>

        <Link
          href="/cadastro"
        >
          <button
            style={
              botaoVerde
            }
          >
            Criar conta
          </button>
        </Link>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 10,
  border:
    "1px solid #ccc",
};

const botaoAzul = {
  width: "100%",
  padding: 12,
  background:
    "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};

const botaoVerde = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  background:
    "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};