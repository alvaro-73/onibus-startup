"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import {
  ROTAS,
  getBairrosUnicos,
  getRotaPorBairro,
  getRotaPorId,
} from "@/data/rotas";
import { useViagem } from "@/contexts/ViagemContext";

export default function MotoristaPage() {
  const router = useRouter();
  const bairros = useMemo(() => getBairrosUnicos(), []);
  const {
    viagemAtiva,
    rotaAtivaId,
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

  const [bairro, setBairro] = useState<string>(bairros[0] ?? "");

  // Ao voltar para esta aba, mostra a rota que está realmente em andamento.
  useEffect(() => {
    if (!viagemAtiva || !rotaAtivaId) return;

    const rotaAtiva = getRotaPorId(rotaAtivaId);
    if (rotaAtiva) setBairro(rotaAtiva.bairro);
  }, [viagemAtiva, rotaAtivaId]);

  const rota = useMemo(
    () => getRotaPorBairro(bairro) ?? ROTAS[0],
    [bairro]
  );

  const [justificativa, setJustificativa] = useState("");

  // AUTH
  useEffect(() => {
    if (!firebaseConfigured) return;

    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login?next=/motorista");
      }
    });

    return () => unsub();
  }, [router]);

  // JUSTIFICATIVA
  async function enviarJustificativa() {
    if (!justificativa.trim()) {
      alert("Digite uma justificativa.");
      return;
    }

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
      setJustificativa("");
      setAlerta(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar justificativa.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold">Área do Motorista</h1>

      <p className="text-sm text-slate-600 mb-4">
        Logado como: {usuario?.email}
      </p>

      <div className="mb-4">
        <label>Selecionar rota</label>

        <select
          value={bairro}
          disabled={viagemAtiva}
          onChange={(e) => setBairro(e.target.value)}
          className="w-full border p-2 rounded"
        >
          {bairros.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>

      <button
        onClick={viagemAtiva ? pararViagem : () => iniciarViagem(bairro)}
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
        <p>Status: {viagemAtiva ? "🟢 Em viagem" : "🔴 Parado"}</p>
      </div>

      {alerta && (
        <div className="mt-4 p-4 bg-red-600 text-white rounded">
          <p>🚨 Possível desvio detectado</p>

          <textarea
            className="w-full mt-2 p-2 text-black"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />

          <button
            onClick={enviarJustificativa}
            className="mt-2 bg-white text-red-600 px-4 py-2 rounded"
          >
            Enviar justificativa
          </button>
        </div>
      )}
    </div>
  );
}
