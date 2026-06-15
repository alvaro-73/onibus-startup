"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  ref,
  set,
} from "firebase/database";

import {
  auth,
  db,
} from "../firebase";

export default function Cadastro() {
  const router = useRouter();

  const [nome, setNome] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [senha, setSenha] =
    useState("");

  const [tipo, setTipo] =
    useState("aluno");

  const [erro, setErro] =
    useState("");

  async function cadastrar() {
    try {
      setErro("");

      const credencial =
        await createUserWithEmailAndPassword(
          auth,
          email,
          senha
        );

      const uid =
        credencial.user.uid;

      await set(
        ref(
          db,
          `usuarios/${uid}`
        ),
        {
          nome,
          email,
          tipo,
        }
      );

      alert(
        "Conta criada com sucesso!"
      );

      router.push("/");
    } catch (error: any) {
      setErro(
        error.message
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
          width: 420,
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h1>
          📝 Cadastro
        </h1>

        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={(e) =>
            setNome(
              e.target.value
            )
          }
          style={inputStyle}
        />

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

        <select
          value={tipo}
          onChange={(e) =>
            setTipo(
              e.target.value
            )
          }
          style={{
            ...inputStyle,
          }}
        >
          <option value="aluno">
            Aluno
          </option>

          <option value="motorista">
            Motorista
          </option>
        </select>

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
          onClick={
            cadastrar
          }
          style={{
            width: "100%",
            padding: 12,
            background:
              "#16a34a",
            color:
              "white",
            border:
              "none",
            borderRadius: 10,
            cursor:
              "pointer",
          }}
        >
          Criar Conta
        </button>
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