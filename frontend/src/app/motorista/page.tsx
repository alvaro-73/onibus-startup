"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import { ref, set } from "firebase/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { ROTAS, getBairrosUnicos, getRotaPorBairro } from "@/data/rotas";

export default function MotoristaPage() {
  const router = useRouter();
  const bairros = useMemo(() => getBairrosUnicos(), []);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [bairro, setBairro] = useState<string>(bairros[0] ?? "");

  const rota = useMemo(
    () => getRotaPorBairro(bairro) ?? ROTAS[0],
    [bairro]
  );

  const [viagemAtiva, setViagemAtiva] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const [velocidadeAtual, setVelocidadeAtual] = useState(0);
  const [posicao, setPosicao] = useState({ lat: 0, lng: 0 });
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("-");

  const [statusIA, setStatusIA] = useState("Aguardando IA...");
  const [alerta, setAlerta] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [consultandoIA, setConsultandoIA] = useState(false);

  // AUTH
  useEffect(() => {
    if (!firebaseConfigured) return;

    const unsub = onAuthStateChanged(auth, (u) => {
      setUsuario(u);

      if (!u) {
        router.push("/login?next=/motorista");
      }
    });

    return () => unsub();
  }, [router]);

  // IA (MESMA LÓGICA DO CÓDIGO ANTIGO — FIXA E ESTÁVEL)
  async function verificarDesvioIA(lat: number, lng: number) {
    if (consultandoIA) return;

    const endpoint =
      process.env.NEXT_PUBLIC_IA_ENDPOINT ||
      "https://startup-onibus-ia1.onrender.com/prever";

    setConsultandoIA(true);

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      const dados = await resp.json();

      if (dados.alerta) {
        setAlerta(true);
        setStatusIA("🚨 Possível desvio detectado");
      } else {
        setAlerta(false);
        setStatusIA("✅ Dentro da rota");
      }
    } catch (err) {
      console.error(err);
      setStatusIA("⚠️ IA indisponível");
    } finally {
      setConsultandoIA(false);
    }
  }

  // INICIAR VIAGEM
  function iniciarViagem() {
    if (viagemAtiva) return;
    if (!firebaseConfigured) return;

    setViagemAtiva(true);

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const velocidade = position.coords.speed ?? 0;
          const velocidadeKmH = velocidade * 3.6;
          const now = Date.now();

          setPosicao({ lat, lng });
          setVelocidadeAtual(velocidadeKmH);
          setUltimaAtualizacao(new Date(now).toLocaleTimeString());

          // 🔥 IA FUNCIONANDO (IGUAL AO ANTIGO)
          await verificarDesvioIA(lat, lng);

          // 🔥 FIREBASE (IMPORTANTE: rota.id)
          await set(ref(db, `onibus/${rota.id}`), {
            lat,
            lng,
            speed: velocidade,
            speedKmH: velocidadeKmH,
            atualizadoEm: now,
            motoristaId: usuario?.uid ?? null,
            motorista: usuario?.email ?? "",
          });

          await set(ref(db, `historico/${rota.id}/${now}`), {
            lat,
            lng,
            speed: velocidade,
            speedKmH: velocidadeKmH,
            timestamp: now,
            rota: rota.id,
          });
        } catch (err) {
          console.error(err);
        }
      },
      (err) => {
        console.error(err);
        setStatusIA("⚠️ Erro ao obter localização");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    setWatchId(id);
  }

  // PARAR VIAGEM
  function pararViagem() {
    setViagemAtiva(false);

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }

  // JUSTIFICATIVA
=======

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

>>>>>>> origin/main
  async function enviarJustificativa() {
    if (!justificativa.trim()) {
      alert("Digite uma justificativa.");
      return;
    }

<<<<<<< HEAD
    try {
      await set(ref(db, `justificativas/${rota.id}/${Date.now()}`), {
        texto: justificativa,
        lat: posicao.lat,
        lng: posicao.lng,
        motorista: usuario?.email ?? "",
        motoristaId: usuario?.uid ?? "",
        criadoEm: Date.now(),
      });

      alert("Justificativa enviada!");
=======
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

>>>>>>> origin/main
      setJustificativa("");
      setAlerta(false);
    } catch (err) {
      console.error(err);
<<<<<<< HEAD
      alert("Erro ao enviar justificativa.");
=======

      alert(
        "Erro ao enviar justificativa."
      );
>>>>>>> origin/main
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
<<<<<<< HEAD
      <h1 className="text-2xl font-bold">Área do Motorista</h1>
=======
      <h1 className="text-2xl font-bold">
        Área do Motorista
      </h1>
>>>>>>> origin/main

      <p className="text-sm text-slate-600 mb-4">
        Logado como: {usuario?.email}
      </p>

      <div className="mb-4">
        <label>Selecionar rota</label>
<<<<<<< HEAD
        <select
          value={bairro}
          disabled={viagemAtiva}
          onChange={(e) => setBairro(e.target.value)}
          className="w-full border p-2 rounded"
        >
          {bairros.map((b) => (
            <option key={b}>{b}</option>
=======

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
>>>>>>> origin/main
          ))}
        </select>
      </div>

      <button
<<<<<<< HEAD
        onClick={viagemAtiva ? pararViagem : iniciarViagem}
        className={`w-full p-3 text-white rounded ${
          viagemAtiva ? "bg-red-600" : "bg-blue-600"
        }`}
      >
        {viagemAtiva ? "Parar viagem" : "Iniciar viagem"}
      </button>

      <div className="mt-4 p-4 border rounded">
        <p>Velocidade: {velocidadeAtual.toFixed(1)} km/h</p>
        <p>Lat: {posicao.lat}</p>
        <p>Lng: {posicao.lng}</p>
        <p>IA: {statusIA}</p>
        <p>Última atualização: {ultimaAtualizacao}</p>
        <p>Status: {viagemAtiva ? "Em viagem" : "Parado"}</p>
=======
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
>>>>>>> origin/main
      </div>

      {alerta && (
        <div className="mt-4 p-4 bg-red-600 text-white rounded">
<<<<<<< HEAD
          <p>🚨 Possível desvio detectado</p>
=======
          <p>
            🚨 Possível desvio detectado
          </p>
>>>>>>> origin/main

          <textarea
            className="w-full mt-2 p-2 text-black"
            value={justificativa}
<<<<<<< HEAD
            onChange={(e) => setJustificativa(e.target.value)}
          />

          <button
            onClick={enviarJustificativa}
=======
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
>>>>>>> origin/main
            className="mt-2 bg-white text-red-600 px-4 py-2 rounded"
          >
            Enviar justificativa
          </button>
        </div>
      )}
    </div>
  );
}