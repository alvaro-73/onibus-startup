"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/layout/Shell";
import BarraPesquisaBairro from "@/components/features/BarraPesquisaBairro";
import RotaCard from "@/components/features/RotaCard";
import { ROTAS, getBairrosUnicos } from "@/data/rotas";
import { useAuthUser } from "@/lib/useAuthUser";

export default function HomePage() {
  const { user } = useAuthUser();
  const [bairro, setBairro] = useState("");
  const bairros = useMemo(() => getBairrosUnicos(), []);
  const rotas = useMemo(
    () => (bairro ? ROTAS.filter((r) => r.bairro === bairro) : ROTAS),
    [bairro],
  );

  return (
    <Shell hideBottomNav={!user}>
      <section className="mx-auto w-full max-w-4xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Encontre sua rota
        </h1>
        <p className="mb-5 text-sm text-slate-600">
          Acompanhe em tempo real o transporte do seu bairro.
        </p>

        <BarraPesquisaBairro bairros={bairros} value={bairro} onChange={setBairro} />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {rotas.map((r) => (
            <RotaCard key={r.id} rota={r} />
          ))}
          {rotas.length === 0 && (
            <p className="text-sm text-slate-500">
              Nenhuma rota encontrada para esse bairro.
            </p>
          )}
        </div>
      </section>
    </Shell>
  );
}
