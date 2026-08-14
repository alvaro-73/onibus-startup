"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function OverflowMenu() {
  const [open, setOpen] = useState(false);
  const [idiomaOpen, setIdiomaOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setIdiomaOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function setIdioma(lang: "pt" | "en") {
    try {
      localStorage.setItem("fluxbus_lang", lang);
      document.cookie = `fluxbus_lang=${lang}; path=/; max-age=31536000`;
    } catch {}
    setOpen(false);
    setIdiomaOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Mais opcoes"
        className="p-2 rounded hover:bg-slate-100 text-slate-700"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
          <Link href="/sobre" className="block px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setOpen(false)}>
            Sobre nos
          </Link>
          <button
            type="button"
            onClick={() => setIdiomaOpen((v) => !v)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
          >
            Idioma
            <span className="text-slate-400">{idiomaOpen ? "-" : "+"}</span>
          </button>
          {idiomaOpen && (
            <div className="pl-4">
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setIdioma("pt")}>
                Portugues
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50" onClick={() => setIdioma("en")}>
                English
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
