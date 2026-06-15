"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";

interface Props {
  bairros: string[];
  value: string;
  onChange: (v: string) => void;
}

export default function BarraPesquisaBairro({ bairros, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setFiltro(value), [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtrados = bairros.filter((b) =>
    b.toLowerCase().includes(filtro.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 focus-within:border-green-600">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          placeholder="Bairro"
          value={filtro}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setFiltro(e.target.value);
            setOpen(true);
            if (e.target.value === "") onChange("");
          }}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          <li
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="cursor-pointer px-3 py-2 text-sm text-slate-600 hover:bg-green-50"
          >
            Todos os bairros
          </li>
          {filtrados.map((b) => (
            <li
              key={b}
              onClick={() => {
                onChange(b);
                setFiltro(b);
                setOpen(false);
              }}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-green-50"
            >
              {b}
            </li>
          ))}
          {filtrados.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">Nenhum bairro encontrado</li>
          )}
        </ul>
      )}
    </div>
  );
}
