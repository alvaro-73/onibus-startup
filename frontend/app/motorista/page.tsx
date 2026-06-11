"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  ref,
  set,
  onValue,
} from "firebase/database";

import {
  auth,
  db,
} from "../firebase";

export default function Motorista() {
  const router = useRouter();

  const [usuario, setUsuario] =
    useState<any>(null);

  const [loadingAuth, setLoadingAuth] =
    useState(true);

  const [iniciado, setIniciado] =
    useState(false);

  const [motoristaAtivo, setMotoristaAtivo] =
    useState("");

  const [watchId, setWatchId] =
    useState<number | null>(null);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          setUsuario(user);
          setLoadingAuth(false);
        }
      );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const viagemRef =
      ref(db, "viagem");

    const unsubscribe =
      onValue(
        viagemRef,
        (snapshot) => {
          const data =
            snapshot.val();

          if (data?.ativa) {
            setIniciado(true);

            setMotoristaAtivo(
              data.motorista || ""
            );
          } else {
            setIniciado(false);

            setMotoristaAtivo("");
          }
        }
      );

    return () => unsubscribe();
  }, []);

  async function iniciarViagem() {
    if (iniciado) return;

    try {
      await set(
        ref(db, "viagem"),
        {
          ativa: true,

          motorista:
            usuario?.email ||
            "Motorista",

          iniciadoEm:
            Date.now(),
        }
      );

      const id =
        navigator.geolocation.watchPosition(
          async (
            position
          ) => {
            const lat =
              position.coords
                .latitude;

            const lng =
              position.coords
                .longitude;

            await set(
              ref(db, "onibus"),
              {
                lat,
                lng,
                atualizadoEm:
                  Date.now(),
              }
            );
          },
          (error) => {
            console.log(
              error
            );
          },
          {
            enableHighAccuracy:
              true,
          }
        );

      setWatchId(id);
    } catch (error) {
      console.log(error);
    }
  }

  async function pararViagem() {
    try {
      if (
        watchId !== null
      ) {
        navigator.geolocation.clearWatch(
          watchId
        );
      }

      await set(
        ref(db, "viagem"),
        {
          ativa: false,

          motorista: "",

          iniciadoEm: null,
        }
      );

      setWatchId(null);
    } catch (error) {
      console.log(error);
    }
  }

  async function sair() {
    await signOut(auth);

    router.push("/");
  }

  if (loadingAuth) {
    return (
      <div
        style={{
          padding: 40,
        }}
      >
        <h2>
          Carregando...
        </h2>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight:
          "100vh",

        background:
          "#f3f4f6",

        padding: 30,

        fontFamily:
          "Arial",
      }}
    >
      <div
        style={{
          maxWidth: 700,

          margin:
            "0 auto",

          background:
            "white",

          padding: 30,

          borderRadius:
            20,

          boxShadow:
            "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
          }}
        >
          👨‍✈️ Área do
          Motorista
        </h1>

        <p>
          <strong>
            Logado:
          </strong>{" "}
          {
            usuario?.email
          }
        </p>

        <div
          style={{
            marginTop: 20,

            marginBottom:
              20,

            padding: 15,

            borderRadius:
              12,

            background:
              iniciado
                ? "#dcfce7"
                : "#fee2e2",
          }}
        >
          <strong>
            Status:{" "}
            {iniciado
              ? "🟢 Viagem em andamento"
              : "🔴 Viagem parada"}
          </strong>
        </div>

        {iniciado && (
          <div
            style={{
              marginBottom:
                25,

              color:
                "#166534",

              fontWeight:
                "bold",
            }}
          >
            Motorista ativo:
            {" "}
            {
              motoristaAtivo
            }
          </div>
        )}

        <div
          style={{
            display:
              "flex",

            gap: 15,

            flexWrap:
              "wrap",
          }}
        >
          <button
            onClick={
              iniciarViagem
            }
            disabled={
              iniciado
            }
            style={{
              padding:
                "16px 24px",

              fontSize: 18,

              border:
                "none",

              borderRadius:
                12,

              background:
                iniciado
                  ? "#9ca3af"
                  : "#22c55e",

              color:
                "white",

              cursor:
                iniciado
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            ▶️ Iniciar
            viagem
          </button>

          <button
            onClick={
              pararViagem
            }
            disabled={
              !iniciado
            }
            style={{
              padding:
                "16px 24px",

              fontSize: 18,

              border:
                "none",

              borderRadius:
                12,

              background:
                "#ef4444",

              color:
                "white",

              opacity:
                iniciado
                  ? 1
                  : 0.5,

              cursor:
                iniciado
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            ⏹️ Parar
            viagem
          </button>

          <button
            onClick={
              sair
            }
            style={{
              padding:
                "16px 24px",

              fontSize: 18,

              border:
                "none",

              borderRadius:
                12,

              background:
                "#2563eb",

              color:
                "white",

              cursor:
                "pointer",
            }}
          >
            🚪 Sair
          </button>
        </div>
      </div>
    </div>
  );
}