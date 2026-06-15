import { MapPin } from "lucide-react";
import type { Rota } from "@/data/rotas";

export default function RotaCard({ rota }: { rota: Rota }) {
  const origem = rota.paradas[0]?.nome ?? "—";
  const destino = rota.paradas[rota.paradas.length - 1]?.nome ?? "—";

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="logo-fluxbus" style={{ fontSize: 22 }}>
            fluxbus
          </span>
          <p className="mt-1 text-sm font-semibold text-slate-900">{rota.motorista}</p>
          <p className="text-xs text-slate-500">{rota.bairro}</p>
        </div>
        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
          {rota.paradas.length} paradas
        </span>
      </div>

      <div className="rounded-lg bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-800">
        {origem} – {destino}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <MapPin size={14} className="text-green-600" />
          <span>Origem: {origem}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin size={14} className="text-green-600" />
          <span>Destino: {destino}</span>
        </div>
      </div>
    </article>
  );
}
