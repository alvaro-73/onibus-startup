"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: React.ReactNode };

const HomeIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const RotaIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M8 6h6a4 4 0 0 1 4 4v4" />
  </svg>
);

export default function BottomNav({ tipo }: { tipo: "aluno" | "motorista" }) {
  const pathname = usePathname();
  const items: Item[] =
    tipo === "motorista"
      ? [
          { href: "/", label: "Inicio", icon: HomeIcon },
          { href: "/motorista", label: "Viagem", icon: RotaIcon },
        ]
      : [{ href: "/", label: "Inicio", icon: HomeIcon }];

  return (
    <>
      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.05)] flex z-40"
        aria-label="Navegacao inferior"
      >
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex-1 flex flex-col items-center justify-center text-xs ${active ? "text-fluxbus-blue" : "text-slate-600"}`}
              style={{ flexBasis: `${100 / items.length}%` }}
            >
              <span className="w-6 h-6 flex items-center justify-center">{it.icon}</span>
              <span className="leading-none mt-1">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex fixed left-0 top-14 bottom-0 w-60 bg-white border-r border-slate-200 flex-col py-4 z-30"
        aria-label="Navegacao lateral"
      >
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm ${active ? "text-fluxbus-blue bg-fluxbus-blue/5 border-r-2 border-fluxbus-blue" : "text-slate-700 hover:bg-slate-50"}`}
            >
              <span className="w-6 h-6 flex items-center justify-center">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
