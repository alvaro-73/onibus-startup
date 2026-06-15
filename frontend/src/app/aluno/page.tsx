"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ref, onValue } from "firebase/database";
import Shell from "@/components/layout/Shell";
import EnvWarning from "@/components/ui/EnvWarning";
import { ROTAS, getRotaById } from "@/data/rotas";
import { getFirebaseDb } from "@/lib/firebase";
import { useAuthUser } from "@/lib/useAuthUser";
import { useRouter } from "next/navigation";

const MapComponent = dynamic(
  () => import("@/components/features/MapComponent"),
  { ssr: false },
);

type ParadaCalculada = {
  nome: string;
  coords: [number, number];
  tempo: string;
  distancia: string;
};

export default function AlunoPage() {
  const router = useRouter();
  const { user, loading, configurado } = useAuthUser();
  const [rotaId, setRotaId] = useState<string>(ROTAS[0]?.id ?? "");
  const rota = useMemo(() => getRotaById(rotaId) ?? ROTAS[0], [rotaId]);

  const [origemAtual, setOrigemAtual] = useState<[number, number]>(rota.origem);
  const [paradas, setParadas] = useState<ParadaCalculada[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && configurado && !user) router.push("/login");
  }, [loading, user, configurado, router]);

  // posição do ônibus em tempo real
  useEffect(() => {
    setOrigemAtual(rota.origem);
    const db = getFirebaseDb();
    if (!db) return;
    const r = ref(db, `onibus/${rota.id}`);
    const unsub = onValue(r, (snap) => {
      const data = snap.val();
      if (data?.lat && data?.lng) setOrigemAtual([data.lat, data.lng]);
    });
    return () => unsub();
  }, [rota]);

  // cálculo de tempos/distâncias com debounce
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;
    if (!apiKey) {
      setAviso("Chave do OpenRouteService não configurada (NEXT_PUBLIC_ORS_API_KEY).");
      setParadas(rota.paradas.map((p) => ({ ...p, tempo: "—", distancia: "—" })));
      return;
    }
    setAviso(null);
    setCarregando(true);
    const timer = setTimeout(async () => {
      let ponto = origemAtual;
      let tempoTotal = 0;
      let distTotal = 0;
      const resultados: ParadaCalculada[] = [];
      try {
        for (const parada of rota.paradas) {
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
                  [ponto[1], ponto[0]],
                  [parada.coords[1], parada.coords[0]],
                ],
              }),
            },
          );
          const data = await resp.json();
          if (!resp.ok || !data?.features?.length) continue;
          const summary = data.features[0].properties.summary;
          tempoTotal += Math.ceil(summary.duration / 60);
          distTotal += summary.distance / 1000;
          resultados.push({
            nome: parada.nome,
            coords: parada.coords,
            tempo: `${tempoTotal} min`,
            distancia: `${distTotal.toFixed(1)} km`,
          });
          ponto = parada.coords;
        }
        setParadas(resultados);
      } catch (err) {
        console.error(err);
        setAviso("Falha ao consultar OpenRouteService.");
      } finally {
        setCarregando(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [rota, origemAtual]);

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
        <h1 className="text-2xl font-bold text-slate-900">Acompanhar ônibus</h1>
        <p className="text-sm text-slate-600">Posição em tempo real e paradas.</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm font-semibold text-slate-700">Rota</label>
          <select
            value={rotaId}
            onChange={(e) => setRotaId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-green-600"
          >
            {ROTAS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.bairro}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setMostrarMapa((v) => !v)}
            className="mt-3 rounded-lg border border-green-600 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            {mostrarMapa ? "Ocultar mapa" : "Mostrar mapa"}
          </button>
        </div>

        {aviso && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {aviso}
          </div>
        )}

        {mostrarMapa && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <MapComponent origem={origemAtual} paradas={rota.paradas} rotaId={rota.id} />
          </div>
        )}

        <div className="mt-4 space-y-2">
          {carregando && <p className="text-sm text-slate-500">Calculando rota...</p>}
          {paradas.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold text-slate-900">{p.nome}</p>
                <p className="text-xs text-slate-500">{p.distancia}</p>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                {p.tempo}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
