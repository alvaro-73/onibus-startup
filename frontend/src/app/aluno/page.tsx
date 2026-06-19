"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";

import { auth, db, firebaseConfigured } from "@/lib/firebase";
import {
  ROTAS,
  getBairrosUnicos,
  getRotaPorBairro,
  getRotaPorId,
} from "@/data/rotas";

const MapComponent = dynamic(
  () => import("@/components/features/MapComponent"),
  { ssr: false }
);

type ParadaCalc = {
  nome: string;
  coords: [number, number];
  tempo: string;
  distancia: string;
};

// 🔥 CONTEÚDO PRINCIPAL
function AlunoContent() {
  const router = useRouter();
  const search = useSearchParams();

  const bairros = useMemo(() => getBairrosUnicos(), []);
  const rotaInicialId = search.get("rota");

  const [loadingAuth, setLoadingAuth] = useState(true);

  const [bairro, setBairro] = useState<string>(() => {
    if (rotaInicialId) {
      const r = getRotaPorId(rotaInicialId);
      if (r) return r.bairro;
    }
    return bairros[0] ?? "";
  });

  const rotaSelecionada = useMemo(
    () => getRotaPorBairro(bairro) ?? ROTAS[0],
    [bairro]
  );

  const [paradas, setParadas] = useState<ParadaCalc[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [origemAtual, setOrigemAtual] = useState<[number, number]>(
    rotaSelecionada!.origem
  );
  const [erroORS, setErroORS] = useState<string | null>(null);

  // 🔥 PROTEÇÃO DE ROTA (CORRETO AGORA)
  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      router.replace("/login");
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
      } else {
        setLoadingAuth(false);
      }
    });

    return () => unsub();
  }, [router]);

  // 🔥 ônibus realtime
  useEffect(() => {
    if (!firebaseConfigured || !rotaSelecionada || !db) return;

    const onibusRef = ref(db, `onibus/${rotaSelecionada.id}`);

    const unsub = onValue(onibusRef, (snap) => {
      const data = snap.val();
      if (data?.lat && data?.lng) {
        setOrigemAtual([data.lat, data.lng]);
      }
    });

    return () => unsub();
  }, [rotaSelecionada]);

  // reset origem
  useEffect(() => {
    if (rotaSelecionada) {
      setOrigemAtual(rotaSelecionada.origem);
    }
  }, [rotaSelecionada]);

  // ORS
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rotaSelecionada) return;

    setErroORS(null);

    const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;

    if (!apiKey) {
      setCarregando(false);
      setErroORS("Chave ORS não configurada.");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setCarregando(true);

      let pontoAtual = origemAtual;
      let tempoTotal = 0;
      let distanciaTotal = 0;

      const resultados: ParadaCalc[] = [];

      try {
        for (const parada of rotaSelecionada.paradas) {
          const resp = await fetch(
            "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
            {
              method: "POST",
              headers: {
                Authorization: apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                coordinates: [
                  [pontoAtual[1], pontoAtual[0]],
                  [parada.coords[1], parada.coords[0]],
                ],
              }),
            }
          );

          const data = await resp.json();

          if (!resp.ok || !data?.features?.length) continue;

          const summary = data.features[0].properties.summary;

          tempoTotal += Math.ceil(summary.duration / 60);
          distanciaTotal += summary.distance / 1000;

          resultados.push({
            nome: parada.nome,
            coords: parada.coords,
            tempo: `${tempoTotal} min`,
            distancia: `${distanciaTotal.toFixed(1)} km`,
          });

          pontoAtual = parada.coords;
        }

        setParadas(resultados);
      } catch (err) {
        setErroORS("Falha ao calcular rota.");
      } finally {
        setCarregando(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rotaSelecionada, origemAtual]);

  // 🔥 loading auth
  if (loadingAuth) {
    return (
      <div className="p-8 text-center text-slate-500">
        Verificando login...
      </div>
    );
  }

  if (!rotaSelecionada) {
    return <div className="p-8">Nenhuma rota disponível.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        Transporte Escolar
      </h1>
      <p className="text-slate-600 mb-6">Rastreamento em tempo real</p>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <label className="text-sm font-medium block mb-2">Bairro</label>

        <select
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          {bairros.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {erroORS && (
        <div className="mb-4 p-3 bg-amber-50 border rounded text-sm">
          {erroORS}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {carregando ? (
          <p className="text-slate-500">Calculando rota...</p>
        ) : (
          paradas.map((p, i) => (
            <div
              key={i}
              className="bg-white border rounded-lg p-4 flex justify-between"
            >
              <div>
                <div className="font-semibold">{p.nome}</div>
                <div className="text-xs text-slate-500">{p.distancia}</div>
              </div>

              <span className="text-blue-600 font-medium">{p.tempo}</span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setMostrarMapa((m) => !m)}
        className="w-full bg-blue-600 text-white py-3 rounded-lg"
      >
        {mostrarMapa ? "Fechar mapa" : "Ver mapa em tempo real"}
      </button>

      {mostrarMapa && (
        <div className="mt-4">
          <MapComponent
            origem={origemAtual}
            paradas={rotaSelecionada.paradas}
          />
        </div>
      )}
    </div>
  );
}

// 🔥 WRAPPER
export default function AlunoPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          Carregando mapa e rotas...
        </div>
      }
    >
      <AlunoContent />
    </Suspense>
  );
}