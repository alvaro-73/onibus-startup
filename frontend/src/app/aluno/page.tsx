"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { db, firebaseConfigured } from "@/lib/firebase";
import { ROTAS, getBairrosUnicos, getRotaPorBairro, getRotaPorId } from "@/data/rotas";

const MapComponent = dynamic(() => import("@/components/features/MapComponent"), { ssr: false });

type ParadaCalc = {
  nome: string;
  coords: [number, number];
  tempo: string;
  distancia: string;
};

type LeituraOnibus = {
  posicao: [number, number];
  atualizadoEm: number;
};

function distanciaMetros(a: [number, number], b: [number, number]) {
  const raioDaTerra = 6371000;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const deltaLat = ((b[0] - a[0]) * Math.PI) / 180;
  const deltaLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * raioDaTerra * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// 1. Todo o conteúdo original e lógica da página ficam aqui dentro
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

  const rotaSelecionada = useMemo(() => getRotaPorBairro(bairro) ?? ROTAS[0], [bairro]);

  const [paradas, setParadas] = useState<ParadaCalc[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [onibusPosicao, setOnibusPosicao] = useState<[number, number] | null>(null);
  const [onibusVelocidade, setOnibusVelocidade] = useState<number | null>(null);
  const [erroORS, setErroORS] = useState<string | null>(null);
  const [proximaParada, setProximaParada] = useState(0);
  const ultimaLeituraRef = useRef<LeituraOnibus | null>(null);

  // Onibus em tempo real (Firebase)
  useEffect(() => {
    // Não mostra a posição anterior enquanto a nova rota é carregada.
    setOnibusPosicao(null);
    setOnibusVelocidade(null);
    ultimaLeituraRef.current = null;

    if (!firebaseConfigured || !rotaSelecionada) return;
    const onibusRef = ref(db, `onibus/${rotaSelecionada.id}`);
    const unsub = onValue(onibusRef, (snap) => {
      const data = snap.val();
      const lat = Number(data?.lat);
      const lng = Number(data?.lng);
      const atualizadoEm = Number(data?.atualizadoEm);
      const temPosicaoValida =
        data?.lat != null &&
        data?.lng != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng);

      // A posição é publicada pelo GPS enquanto a viagem está ativa. O
      // estado `false` é mantido somente por compatibilidade com registros
      // antigos; ao encerrar, o motorista remove o registro por completo.
      if (data?.viagemAtiva !== false && temPosicaoValida) {
        const posicaoAtual: [number, number] = [lat, lng];
        const instanteAtual = Number.isFinite(atualizadoEm)
          ? atualizadoEm
          : Date.now();
        const leituraAnterior = ultimaLeituraRef.current;

        setOnibusPosicao(posicaoAtual);

        if (leituraAnterior && instanteAtual > leituraAnterior.atualizadoEm) {
          const metrosPercorridos = distanciaMetros(
            leituraAnterior.posicao,
            posicaoAtual
          );
          const horasDecorridas =
            (instanteAtual - leituraAnterior.atualizadoEm) / 3600000;
          const velocidadeCalculada =
            horasDecorridas > 0
              ? (metrosPercorridos / 1000) / horasDecorridas
              : null;

          // Pequenas oscilações do GPS não contam como movimento do ônibus.
          setOnibusVelocidade(
            metrosPercorridos < 10 ||
              !velocidadeCalculada ||
              velocidadeCalculada > 90
              ? 0
              : velocidadeCalculada
          );
        } else {
          // A primeira leitura não confirma se o ônibus está em movimento.
          setOnibusVelocidade(null);
        }

        ultimaLeituraRef.current = {
          posicao: posicaoAtual,
          atualizadoEm: instanteAtual,
        };
      } else {
        setOnibusPosicao(null);
        setOnibusVelocidade(null);
      }
    });
    return () => unsub();
  }, [rotaSelecionada]);

  // A previsão só avança quando o ônibus realmente chega à parada atual.
  useEffect(() => {
    setProximaParada(0);
  }, [rotaSelecionada]);

  useEffect(() => {
    if (!onibusPosicao || proximaParada >= rotaSelecionada.paradas.length) {
      return;
    }

    const paradaAtual = rotaSelecionada.paradas[proximaParada];
    const raioDaTerra = 6371000;
    const lat1 = (onibusPosicao[0] * Math.PI) / 180;
    const lat2 = (paradaAtual.coords[0] * Math.PI) / 180;
    const deltaLat = ((paradaAtual.coords[0] - onibusPosicao[0]) * Math.PI) / 180;
    const deltaLng = ((paradaAtual.coords[1] - onibusPosicao[1]) * Math.PI) / 180;
    const h =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const distancia = 2 * raioDaTerra * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    if (distancia <= 50) {
      setProximaParada((atual) => Math.min(atual + 1, rotaSelecionada.paradas.length));
    }
  }, [onibusPosicao, proximaParada, rotaSelecionada]);

  // A previsão começa na posição atual do ônibus e é atualizada a cada
  // nova localização recebida do GPS.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!rotaSelecionada) return;
    setErroORS(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let ignorarResultado = false;

    debounceRef.current = setTimeout(async () => {
      setCarregando(true);
      const pontoAtual = onibusPosicao ?? rotaSelecionada.origem;
      const paradasPendentes = rotaSelecionada.paradas.slice(proximaParada);
      let tempoTotal = 0;
      let distanciaTotal = 0;
      const resultados: ParadaCalc[] = [];
      try {
        if (paradasPendentes.length === 0) {
          setParadas([]);
          return;
        }

        const resp = await fetch(
          "/api/rotas",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              coordinates: [
                [pontoAtual[1], pontoAtual[0]],
                ...paradasPendentes.map((parada) => [parada.coords[1], parada.coords[0]]),
              ],
            }),
          },
        );
        const data = await resp.json();
        if (ignorarResultado) return;

        if (!resp.ok) {
          throw new Error(
            data?.erro ?? `OpenRouteService respondeu ${resp.status}.`
          );
        }

        const segmentos = data?.features?.[0]?.properties?.segments;
        if (!Array.isArray(segmentos) || segmentos.length < paradasPendentes.length) {
          throw new Error("Não foi possível calcular a previsão das paradas.");
        }

        for (const [indice, parada] of paradasPendentes.entries()) {
          const segmento = segmentos[indice];
          tempoTotal += segmento.duration;
          distanciaTotal += segmento.distance / 1000;
          resultados.push({
            nome: parada.nome,
            coords: parada.coords,
            tempo:
              onibusVelocidade && onibusVelocidade >= 3
                ? `${Math.ceil((distanciaTotal / onibusVelocidade) * 60)} min`
                : "Aguardando o ônibus se mover",
            distancia: `${distanciaTotal.toFixed(1)} km`,
          });
        }
        if (!ignorarResultado) setParadas(resultados);
      } catch (err) {
        if (ignorarResultado) return;

        console.error(err);
        setErroORS(
          err instanceof Error
            ? err.message
            : "Falha ao consultar OpenRouteService."
        );
      } finally {
        if (!ignorarResultado) setCarregando(false);
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      ignorarResultado = true;
    };
  }, [rotaSelecionada, onibusPosicao, onibusVelocidade, proximaParada]);

  if (!rotaSelecionada) return <div className="p-8">Nenhuma rota disponivel.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Transporte Escolar</h1>
      <p className="text-slate-600 mb-6">Rastreamento em tempo real</p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <label className="text-sm font-medium text-slate-700 block mb-2">Bairro</label>
        <select
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue"
        >
          {bairros.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {erroORS && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          {erroORS}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {carregando ? (
          <p className="text-slate-500">Calculando rota...</p>
        ) : (
          paradas.map((p, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-900">{p.nome}</div>
                <div className="text-xs text-slate-500">{p.distancia}</div>
              </div>
              <span className="text-sm text-fluxbus-blue font-medium">{p.tempo}</span>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setMostrarMapa((m) => !m)}
        className="w-full bg-fluxbus-blue text-white py-3 rounded-lg font-semibold hover:bg-fluxbus-blue-600"
      >
        {mostrarMapa ? "Fechar mapa" : "Ver mapa em tempo real"}
      </button>

      {mostrarMapa && (
        <div className="mt-4">
        <MapComponent
         origem={rotaSelecionada.origem}
         paradas={rotaSelecionada.paradas}
         onibusPosicao={onibusPosicao}
        />
        </div>
      )}
    </div>
  );
}

// 2. O export padrão envolve o conteúdo com o Suspense para blindar o Build do Next.js
export default function AlunoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando mapa e rotas...</div>}>
      <AlunoContent />
    </Suspense>
  );
}
