"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set } from "firebase/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { ROTAS, getBairrosUnicos, getRotaPorBairro } from "@/data/rotas";

export default function MotoristaPage() {
  const router = useRouter();
  const bairros = useMemo(() => getBairrosUnicos(), []);

  const [usuario, setUsuario] = useState<User | null>(null);
  const [bairro, setBairro] = useState<string>(bairros[0] ?? "");
  const rota = useMemo(() => getRotaPorBairro(bairro) ?? ROTAS[0], [bairro]);

  const [viagemAtiva, setViagemAtiva] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [velocidadeAtual, setVelocidadeAtual] = useState(0);
  const [posicao, setPosicao] = useState({ lat: 0, lng: 0 });
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("-");
  const [statusIA, setStatusIA] = useState("Aguardando IA...");
  const [alerta, setAlerta] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [consultandoIA, setConsultandoIA] = useState(false);

  // Auth listener
  useEffect(() => {
    if (!firebaseConfigured) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      if (!u) router.push("/login?next=/motorista");
    });
    return () => unsub();
  }, [router]);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  async function verificarDesvioIA(lat: number, lng: number) {
    if (consultandoIA) return;
    const endpoint = process.env.NEXT_PUBLIC_IA_ENDPOINT;
    if (!endpoint) {
      setStatusIA("IA nao configurada (NEXT_PUBLIC_IA_ENDPOINT)");
      return;
    }
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
        setStatusIA("Possivel desvio detectado");
      } else {
        setAlerta(false);
        setStatusIA("Dentro da rota");
      }
    } catch (err) {
      console.error(err);
      setStatusIA("IA indisponivel");
    } finally {
      setConsultandoIA(false);
    }
  }

  function iniciarViagem() {
    if (viagemAtiva) return;
    if (!firebaseConfigured) {
      setStatusIA("Firebase nao configurado.");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatusIA("Geolocalizacao nao suportada.");
      return;
    }
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

          await verificarDesvioIA(lat, lng);

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
        } catch (erro) {
          console.error(erro);
        }
      },
      (erro) => {
        console.error("Erro GPS:", erro);
        setStatusIA("Erro ao obter localizacao");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );

    setWatchId(id);
  }

  function pararViagem() {
    setViagemAtiva(false);
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }

  async function enviarJustificativa() {
    if (justificativa.trim() === "") {
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
    } catch (erro) {
      console.error(erro);
      alert("Erro ao enviar justificativa.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Area do Motorista</h1>
      <p className="text-sm text-slate-600 mb-6">Logado como {usuario?.email ?? "—"}</p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <label className="text-sm font-medium text-slate-700 block mb-2">Selecionar rota</label>
        <select
          value={bairro}
          disabled={viagemAtiva}
          onChange={(e) => setBairro(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue disabled:opacity-60"
        >
          {bairros.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={viagemAtiva ? pararViagem : iniciarViagem}
        className={`w-full py-3 rounded-lg font-semibold text-white mb-4 ${
          viagemAtiva ? "bg-red-600 hover:bg-red-700" : "bg-fluxbus-blue hover:bg-fluxbus-blue-600"
        }`}
      >
        {viagemAtiva ? "Parar Gravacao" : "Gravar Rota"}
      </button>

      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
        <p>
          <span className="text-slate-500">Velocidade:</span>{" "}
          <span className="font-medium">{velocidadeAtual.toFixed(1)} km/h</span>
        </p>
        <p>
          <span className="text-slate-500">Latitude:</span> {posicao.lat}
        </p>
        <p>
          <span className="text-slate-500">Longitude:</span> {posicao.lng}
        </p>
        <p>
          <span className="text-slate-500">IA:</span> {statusIA}
        </p>
        <p>
          <span className="text-slate-500">Ultima atualizacao:</span> {ultimaAtualizacao}
        </p>
        <p>
          <span className="text-slate-500">Status:</span> {viagemAtiva ? "Em viagem" : "Parado"}
        </p>
      </div>

      {alerta && (
        <div className="mt-4 bg-red-600 text-white rounded-xl p-4">
          <h2 className="font-semibold mb-2">Possivel desvio detectado</h2>
          <p className="text-sm mb-2">Informe o motivo:</p>
          <textarea
            rows={4}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            className="w-full px-3 py-2 rounded text-slate-900"
          />
          <button
            type="button"
            onClick={enviarJustificativa}
            className="mt-3 bg-white text-red-600 font-semibold px-4 py-2 rounded"
          >
            Enviar justificativa
          </button>
        </div>
      )}
    </div>
  );
}
