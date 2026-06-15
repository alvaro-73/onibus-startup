"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set } from "firebase/database";
import { Play, Square, AlertTriangle } from "lucide-react";
import Shell from "@/components/layout/Shell";
import EnvWarning from "@/components/ui/EnvWarning";
import { ROTAS, getRotaById } from "@/data/rotas";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuthUser } from "@/lib/useAuthUser";

export default function MotoristaPage() {
  const router = useRouter();
  const { user, loading, configurado } = useAuthUser();
  const [rotaId, setRotaId] = useState<string>(ROTAS[0]?.id ?? "");
  const rota = useMemo(() => getRotaById(rotaId) ?? ROTAS[0], [rotaId]);

  const [gravando, setGravando] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [posicao, setPosicao] = useState({ lat: 0, lng: 0 });
  const [velocidade, setVelocidade] = useState(0);
  const [ultima, setUltima] = useState("-");
  const [statusIA, setStatusIA] = useState("Aguardando IA...");
  const [alerta, setAlerta] = useState(false);
  const consultandoIA = useRef(false);

  useEffect(() => {
    if (!loading && configurado && !user) router.push("/login");
  }, [loading, user, configurado, router]);

  // garante parar GPS ao desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  async function verificarIA(lat: number, lng: number) {
    if (consultandoIA.current) return;
    const endpoint = process.env.NEXT_PUBLIC_IA_ENDPOINT;
    if (!endpoint) {
      setStatusIA("IA não configurada");
      return;
    }
    consultandoIA.current = true;
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await resp.json();
      if (data.alerta) {
        setAlerta(true);
        setStatusIA("Possível desvio detectado");
      } else {
        setAlerta(false);
        setStatusIA("Dentro da rota");
      }
    } catch {
      setStatusIA("IA indisponível");
    } finally {
      consultandoIA.current = false;
    }
  }

  function iniciar() {
    const db = getFirebaseDb();
    if (!db) {
      alert("Firebase não configurado.");
      return;
    }
    if (gravando) return;
    if (!("geolocation" in navigator)) {
      alert("Geolocalização não suportada neste navegador.");
      return;
    }
    setGravando(true);
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = pos.coords.speed ?? 0;
        const speedKmH = speed * 3.6;
        const now = Date.now();
        setPosicao({ lat, lng });
        setVelocidade(speedKmH);
        setUltima(new Date(now).toLocaleTimeString());
        try {
          await set(ref(db, `onibus/${rota.id}`), {
            lat,
            lng,
            speed,
            speedKmH,
            atualizadoEm: now,
            motoristaId: user?.uid ?? null,
            motorista: user?.email ?? "",
          });
          await set(ref(db, `historico/${rota.id}/${now}`), {
            lat,
            lng,
            speed,
            speedKmH,
            timestamp: now,
            rota: rota.id,
          });
        } catch (err) {
          console.error(err);
        }
        await verificarIA(lat, lng);
      },
      (err) => {
        console.error(err);
        setStatusIA("Erro ao obter localização");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    watchIdRef.current = id;
  }

  function parar() {
    setGravando(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  if (!configurado) {
    return (
      <Shell>
        <EnvWarning message="Firebase não configurado. Verifique o arquivo .env.local." />
      </Shell>
    );
  }

  return (
    <Shell>
      <section className="mx-auto w-full max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Painel do Motorista</h1>
        <p className="text-sm text-slate-600">Inicie a viagem para começar o rastreamento.</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm font-semibold text-slate-700">Rota</label>
          <select
            value={rotaId}
            disabled={gravando}
            onChange={(e) => setRotaId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-green-600 disabled:bg-slate-100"
          >
            {ROTAS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.bairro}
              </option>
            ))}
          </select>

          <div className="mt-4 flex gap-2">
            {!gravando ? (
              <button
                onClick={iniciar}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700"
              >
                <Play size={18} /> Gravar Rota
              </button>
            ) : (
              <button
                onClick={parar}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
              >
                <Square size={18} /> Parar Gravação
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Velocidade" valor={`${velocidade.toFixed(1)} km/h`} />
          <Info label="Status" valor={gravando ? "Em viagem" : "Parado"} />
          <Info label="Latitude" valor={posicao.lat.toFixed(6)} />
          <Info label="Longitude" valor={posicao.lng.toFixed(6)} />
          <Info label="IA" valor={statusIA} />
          <Info label="Última atualização" valor={ultima} />
        </div>

        {alerta && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
            <AlertTriangle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Possível desvio detectado</p>
              <p className="text-sm">Verifique a rota e siga as orientações da operação.</p>
            </div>
          </div>
        )}
      </section>
    </Shell>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{valor}</p>
    </div>
  );
}
