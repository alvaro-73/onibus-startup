"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ref, set } from "firebase/database";

import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import { auth, db } from "../firebase";

type Rota = "aldeiaPark" | "buriti";

export default function Motorista() {
  const router = useRouter();

  const [velocidadeAtual, setVelocidadeAtual] =
  useState(0);

  const [usuario, setUsuario] =
    useState<User | null>(null);

  const [rotaSelecionada, setRotaSelecionada] =
    useState<Rota>("aldeiaPark");

  const [viagemAtiva, setViagemAtiva] =
    useState(false);

  const [watchId, setWatchId] =
    useState<number | null>(null);

  const [alerta, setAlerta] =
    useState(false);

  const [consultandoIA, setConsultandoIA] =
    useState(false);

  const [justificativa, setJustificativa] =
    useState("");

  const [statusIA, setStatusIA] =
    useState("Aguardando IA...");

  const [ultimaAtualizacao, setUltimaAtualizacao] =
    useState("-");

  const [posicao, setPosicao] =
    useState({
      lat: 0,
      lng: 0,
    });

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(auth, (user) => {
        setUsuario(user);

        if (!user) {
          router.push("/");
        }
      });

    return () => unsubscribe();
  }, [router]);

  async function verificarDesvioIA(
    lat: number,
    lng: number
  ) {
    if (consultandoIA) return;

    setConsultandoIA(true);

    try {
      const resposta = await fetch(
        "https://startup-onibus-ia1.onrender.com/prever",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            lat,
            lng,
          }),
        }
      );
        
      const dados =
        await resposta.json();

      if (dados.alerta) {
        setAlerta(true);

        setStatusIA(
          "🚨 Possível desvio detectado"
        );
      } else {
        setAlerta(false);

        setStatusIA(
          "✅ Dentro da rota"
        );
      }
    } catch (erro) {
      console.error(erro);

      setStatusIA(
        "⚠️ IA indisponível"
      );
    } finally {
      setConsultandoIA(false);
    }
  }

  async function iniciarViagem() {
    if (viagemAtiva) return;

    setViagemAtiva(true);

    const id =
      navigator.geolocation.watchPosition(
        async (position) => {
          try {

            const lat =
              position.coords.latitude;

            const lng =
              position.coords.longitude;
            
            const velocidade =
              position.coords.speed ?? 0;

            const velocidadeKmH =
              velocidade * 3.6;

            const now =
              Date.now();

            setPosicao({
              lat,
              lng,
            });
            setVelocidadeAtual(
              velocidadeKmH
            );
            setUltimaAtualizacao(
              new Date(
                now
              ).toLocaleTimeString()
            );

            await verificarDesvioIA(
              lat,
              lng
            );

            await set(
              ref(
                db,
                `onibus/${rotaSelecionada}`
              ),
              {
                lat,
                lng,
                speed: velocidade,
                speedKmH: velocidadeKmH,

                atualizadoEm: now,

                motoristaId:
                  usuario?.uid ?? null,

                motorista:
                  usuario?.email ?? "",
              }
            );

            await set(
              ref(
                db,
                `historico/${rotaSelecionada}/${now}`
              ),
              {
                lat,
                lng,

                speed: velocidade,
                speedKmH: velocidadeKmH,

                timestamp: now,

                rota:
                  rotaSelecionada,
              }
            );
          } catch (erro) {
            console.error(erro);
          }
        },
        (erro) => {
          console.error(
            "Erro GPS:",
            erro
          );

          setStatusIA(
            "⚠️ Erro ao obter localização"
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );

    setWatchId(id);
  }

  function pararViagem() {
    setViagemAtiva(false);

    if (watchId !== null) {
      navigator.geolocation.clearWatch(
        watchId
      );

      setWatchId(null);
    }
  }

  async function enviarJustificativa() {
    if (
      justificativa.trim() === ""
    ) {
      alert(
        "Digite uma justificativa."
      );

      return;
    }

    try {
      await set(
        ref(
          db,
          `justificativas/${rotaSelecionada}/${Date.now()}`
        ),
        {
          texto: justificativa,

          lat: posicao.lat,

          lng: posicao.lng,

          motorista:
            usuario?.email ?? "",

          motoristaId:
            usuario?.uid ?? "",

          criadoEm:
            Date.now(),
        }
      );

      alert(
        "Justificativa enviada!"
      );

      setJustificativa("");

      setAlerta(false);
    } catch (erro) {
      console.error(erro);

      alert(
        "Erro ao enviar justificativa."
      );
    }
  }

  async function sair() {
    try {
      await signOut(auth);

      router.push("/");
    } catch (erro) {
      console.error(erro);
    }
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <h1>
        👨‍✈️ Área do Motorista
      </h1>

      <p>
        Logado como:
        {" "}
        {usuario?.email}
      </p>

      <button
        onClick={sair}
        style={{
          padding: 10,
          marginBottom: 20,
        }}
      >
        🚪 Sair
      </button>

      <hr />

      <h3>Selecionar rota</h3>

      <select
        value={rotaSelecionada}
        disabled={viagemAtiva}
        onChange={(e) =>
          setRotaSelecionada(
            e.target.value as Rota
          )
        }
      >
        <option value="aldeiaPark">
          Aldeia Park
        </option>

        <option value="buriti">
          Buriti
        </option>
      </select>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 20,
        }}
      >
        <button
          onClick={iniciarViagem}
          disabled={viagemAtiva}
        >
          ▶️ Iniciar viagem
        </button>

        <button
          onClick={pararViagem}
          disabled={!viagemAtiva}
        >
          ⏹️ Parar viagem
        </button>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 15,
          border:
            "1px solid #ccc",
          borderRadius: 10,
        }}
      >
        <p>
          📍 Latitude:
          {" "}
          {posicao.lat}
        </p>

        <p>
          📍 Longitude:
          {" "}
          {posicao.lng}
        </p>

        <p>
          🤖 IA:
          {" "}
          {statusIA}
        </p>

        <p>
          🕒 Última atualização:
          {" "}
          {ultimaAtualizacao}
        </p>

        <p>
          🚌 Status:
          {" "}
          {viagemAtiva
            ? "Em viagem"
            : "Parado"}
        </p>
      </div>

      {alerta && (
        <div
          style={{
            marginTop: 20,
            background:
              "#ff4444",
            color: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <h2>
            🚨 Possível desvio detectado
          </h2>

          <p>
            Informe o motivo:
          </p>

          <textarea
            rows={5}
            value={justificativa}
            onChange={(e) =>
              setJustificativa(
                e.target.value
              )
            }
            style={{
              width: "100%",
            }}
          />
          <p>
             Velocidade:
            {" "}
            {velocidadeAtual.toFixed(1)}
            {" "}
            km/h
          </p>
          <button
            onClick={
              enviarJustificativa
            }
            style={{
              marginTop: 10,
              padding: 10,
            }}
          >
            Enviar justificativa
          </button>
        </div>
      )}
    </div>
  );
  
}