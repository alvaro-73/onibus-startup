"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Route as RouteIcon } from "lucide-react";
import { useAuthUser } from "@/lib/useAuthUser";

interface Item {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export default function BottomNav() {
  const { user, papel, loading } = useAuthUser();
  const pathname = usePathname();

  if (loading || !user) return null;

  const items: Item[] =
    papel === "motorista"
      ? [
          { href: "/", label: "Início", icon: Home },
          { href: "/motorista", label: "Viagem", icon: RouteIcon },
          { href: "/perfil", label: "Perfil", icon: User },
        ]
      : [
          { href: "/", label: "Início", icon: Home },
          { href: "/perfil", label: "Perfil", icon: User },
        ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-30 flex h-14 border-t border-slate-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)] md:top-14 md:h-[calc(100vh-3.5rem)] md:w-60 md:flex-col md:border-r md:border-t-0 md:shadow-none"
    >
      {items.map((it) => {
        const active = pathname === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs md:flex-none md:flex-row md:justify-start md:gap-3 md:px-6 md:py-3 md:text-sm ${
              active ? "text-green-600 font-semibold" : "text-slate-600 hover:text-green-600"
            }`}
          >
            <Icon size={24} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
