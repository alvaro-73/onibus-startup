"use client";

import { useMemo, useState } from "react";
import { ROTAS, getBairrosUnicos } from "@/data/rotas";
import BairroSearch from "@/components/features/BairroSearch";
import RouteCard from "@/components/features/RouteCard";

export default function LandingPage() {
  const bairros = useMemo(() => getBairrosUnicos(), []);
  const [filtro, setFiltro] = useState("");

  const rotasFiltradas = filtro
    ? ROTAS.filter((r) => r.bairro.toLowerCase().includes(filtro.toLowerCase()))
    : ROTAS;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Rotas disponiveis</h1>
      <p className="text-slate-600 mb-6">Pesquise pelo bairro para encontrar a rota.</p>

      <div className="mb-6">
        <BairroSearch bairros={bairros} value={filtro} onChange={setFiltro} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rotasFiltradas.map((r) => (
          <RouteCard key={r.id} rota={r} />
        ))}
        {rotasFiltradas.length === 0 && (
          <p className="text-slate-500 text-sm col-span-full">Nenhuma rota para esse bairro.</p>
        )}
      </div>
    </div>
  );
}
