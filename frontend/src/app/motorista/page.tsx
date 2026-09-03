"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ref, set } from "firebase/database";

import { db } from "@/lib/firebase";

import {
  ROTAS,
  getBairrosUnicos,
  getRotaPorBairro,
} from "@/data/rotas";

import { useViagem } from "@/contexts/ViagemContext";

export default function MotoristaPage() {
  const router = useRouter();

  const bairros = useMemo(
    () => getBairrosUnicos(),
    []
  );

  const [bairro, setBairro] = useState(
    bairros[0] ?? ""
  );

  const rota = useMemo(
    () =>
      getRotaPorBairro(bairro) ??
      ROTAS[0],
    [bairro]
  );

  const {
    viagemAtiva,
    velocidadeAtual,
    posicao,
    ultimaAtualizacao,
    statusIA,
    alerta,
    usuario,
    iniciarViagem,
    pararViagem,
    setAlerta,
  } = useViagem();

  const [justificativa, setJustificativa] =
    useState("");

  // Se não estiver logado
  useEffect(() => {
    if (usuario === null) {
      return;
    }
  }, [usuario]);

  async function enviarJustificativa() {
    if (!justificativa.trim()) {
      alert("Digite uma justificativa.");
      return;
    }

    if (!rota) return;

    try {
      await set(
        ref(
          db,
          `justificativas/${rota.id}/${Date.now()}`
        ),
        {
          texto: justificativa,

          lat: posicao.lat,
          lng: posicao.lng,

          motorista:
            usuario?.email ?? "",

          motoristaId:
            usuario?.uid ?? "",

          criadoEm: Date.now(),
        }
      );

      alert("Justificativa enviada!");

      setJustificativa("");
      setAlerta(false);
    } catch (err) {
      console.error(err);

      alert(
        "Erro ao enviar justificativa."
      );
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold">
        Área do Motorista
      </h1>

      <p className="text-sm text-slate-600 mb-4">
        Logado como: {usuario?.email}
      </p>

      <div className="mb-4">
        <label>Selecionar rota</label>

        <select
          value={bairro}
          disabled={viagemAtiva}
          onChange={(e) =>
            setBairro(e.target.value)
          }
          className="w-full border p-2 rounded"
        >
          {bairros.map((b) => (
            <option key={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() =>
          viagemAtiva
            ? pararViagem()
            : iniciarViagem(bairro)
        }
        className={`w-full p-3 text-white rounded ${
          viagemAtiva
            ? "bg-red-600"
            : "bg-blue-600"
        }`}
      >
        {viagemAtiva
          ? "Parar viagem"
          : "Iniciar viagem"}
      </button>

      <div className="mt-4 p-4 border rounded">
        <p>
          Velocidade:{" "}
          {velocidadeAtual.toFixed(1)} km/h
        </p>

        <p>Lat: {posicao.lat}</p>

        <p>Lng: {posicao.lng}</p>

        <p>IA: {statusIA}</p>

        <p>
          Última atualização:{" "}
          {ultimaAtualizacao}
        </p>

        <p>
          Status:{" "}
          {viagemAtiva
            ? "🟢 Em viagem"
            : "🔴 Parado"}
        </p>
      </div>

      {alerta && (
        <div className="mt-4 p-4 bg-red-600 text-white rounded">
          <p>
            🚨 Possível desvio detectado
          </p>

          <textarea
            className="w-full mt-2 p-2 text-black"
            value={justificativa}
            onChange={(e) =>
              setJustificativa(
                e.target.value
              )
            }
          />

          <button
            onClick={
              enviarJustificativa
            }
            className="mt-2 bg-white text-red-600 px-4 py-2 rounded"
          >
            Enviar justificativa
          </button>
        </div>
      )}
    </div>
  );
}