"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  bairros: string[];
  value: string;
  onChange: (v: string) => void;
};

export default function BairroSearch({ bairros, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtrados = value
    ? bairros.filter((b) => b.toLowerCase().includes(value.toLowerCase()))
    : bairros;

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        placeholder="Bairro"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue focus:border-fluxbus-blue"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg">
          {filtrados.length === 0 ? (
            <div className="px-4 py-2 text-sm text-slate-500">Nenhum bairro</div>
          ) : (
            filtrados.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  onChange(b);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-fluxbus-blue/5"
              >
                {b}
              </button>
            ))
          )}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-xs text-slate-500 border-t hover:bg-slate-50"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}
    </div>
  );
}
