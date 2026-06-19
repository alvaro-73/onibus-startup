"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { db, firebaseConfigured } from "@/lib/firebase";
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

function AlunoContent() {
  const bairros = useMemo(() => getBairrosUnicos(), []);
  const search = useSearchParams();
  const rotaInicialId = search.get("rota");

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

  // ônibus em tempo real
  useEffect(() => {
    if (!firebaseConfigured || !rotaSelecionada) return;

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

  // 🚀 ORS otimizado (1 request só)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rotaSelecionada) return;

    const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;

    if (!apiKey) {
      setErroORS("ORS não configurado");
      setCarregando(false);

      setParadas(
        rotaSelecionada.paradas.map((p) => ({
          ...p,
          tempo: "-",
          distancia: "-",
        }))
      );

      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setCarregando(true);
      setErroORS(null);

      try {
        const coords = [
          [origemAtual[1], origemAtual[0]],
          ...rotaSelecionada.paradas.map((p) => [
            p.coords[1],
            p.coords[0],
          ]),
        ];

        const resp = await fetch(
          "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
          {
            method: "POST",
            headers: {
              Authorization: apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              coordinates: coords,
            }),
          }
        );

        const data = await resp.json();

        if (!resp.ok || !data?.features?.length) {
          throw new Error("Erro ORS");
        }

        const summary = data.features[0].properties.summary;

        const totalMin = Math.ceil(summary.duration / 60);
        const totalKm = summary.distance / 1000;

        let acumuladoMin = 0;
        let acumuladoKm = 0;

        const resultado: ParadaCalc[] = rotaSelecionada.paradas.map(
          (p, i) => {
            const progresso = (i + 1) / rotaSelecionada.paradas.length;

            acumuladoMin = Math.ceil(totalMin * progresso);
            acumuladoKm = totalKm * progresso;

            return {
              nome: p.nome,
              coords: p.coords,
              tempo: `${acumuladoMin} min`,
              distancia: `${acumuladoKm.toFixed(1)} km`,
            };
          }
        );

        setParadas(resultado);
      } catch (err) {
        console.error(err);
        setErroORS("Falha ao calcular rota");
      } finally {
        setCarregando(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [rotaSelecionada, origemAtual]);

  if (!rotaSelecionada) {
    return <div className="p-8">Nenhuma rota disponível</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold">Transporte Escolar</h1>

      <div className="bg-white p-4 rounded-xl mb-4">
        <label className="text-sm">Bairro</label>

        <select
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          className="w-full border p-2 rounded"
        >
          {bairros.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </div>

      {erroORS && (
        <div className="bg-yellow-100 p-3 rounded mb-3 text-sm">
          {erroORS}
        </div>
      )}

      <div className="space-y-2">
        {carregando ? (
          <p>Calculando rota...</p>
        ) : (
          paradas.map((p, i) => (
            <div
              key={i}
              className="p-3 border rounded flex justify-between"
            >
              <div>
                <b>{p.nome}</b>
                <div className="text-xs">{p.distancia}</div>
              </div>
              <span>{p.tempo}</span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setMostrarMapa((m) => !m)}
        className="w-full mt-4 bg-blue-600 text-white p-3 rounded"
      >
        {mostrarMapa ? "Fechar mapa" : "Ver mapa"}
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

export default function AlunoPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center">
          Carregando...
        </div>
      }
    >
      <AlunoContent />
    </Suspense>
  );
}