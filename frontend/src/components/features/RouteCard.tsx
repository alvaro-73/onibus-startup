"use client";

import Link from "next/link";
import { Rota } from "@/data/rotas";

export default function RouteCard({ rota }: { rota: Rota }) {
  const origem = rota.paradas[0]?.nome ?? "-";
  const destino = rota.paradas[rota.paradas.length - 1]?.nome ?? "-";

  return (
    <Link
      href={`/aluno?rota=${rota.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-fluxbus-blue hover:shadow-md transition"
    >
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900 leading-tight">
          {rota.bairro}
        </h3>

        <p className="text-sm font-medium text-slate-500 mt-1">
          Motorista: {rota.motorista}
        </p>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <span className="text-base font-semibold text-slate-800">
            Origem: {origem}
          </span>

          <span className="text-base font-medium text-slate-800">
            Destino: {destino}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <span className="text-sm font-medium text-slate-500">
          {rota.paradas.length} paradas
        </span>
      </div>
    </Link>
  );
}