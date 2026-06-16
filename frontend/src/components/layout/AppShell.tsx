"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { Logo } from "../ui/Logo";
import AvatarDropdown from "../ui/AvatarDropdown";
import OverflowMenu from "../ui/OverflowMenu";
import BottomNav from "../ui/BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, tipo, nome, loading, configured } = useAuth();

  async function sair() {
    try {
      if (firebaseConfigured) await signOut(auth);
    } catch {}
    try {
      document.cookie = "fluxbus_auth=; path=/; max-age=0";
    } catch {}
    router.push("/");
  }

  const autenticado = !!user && !loading;
  const mostraBottom = autenticado && (tipo === "aluno" || tipo === "motorista");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
        <Logo />
        <div className="flex items-center gap-2">
          {!configured && (
            <span className="hidden sm:inline text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Variaveis de ambiente nao configuradas
            </span>
          )}
          {!autenticado && (
            <Link
              href="/login"
              className="text-sm font-medium text-fluxbus-blue border border-fluxbus-blue bg-white px-4 py-1.5 rounded hover:bg-fluxbus-blue hover:text-white transition"
            >
              Entrar
            </Link>
          )}
          {autenticado && (
            <>
              <AvatarDropdown uid={user!.uid} nome={nome} email={user!.email} onSair={sair} />
              <OverflowMenu />
            </>
          )}
        </div>
      </header>

      <main className={`flex-1 ${mostraBottom ? "md:ml-60 pb-16 md:pb-0" : ""}`}>{children}</main>

      {mostraBottom && <BottomNav tipo={tipo as "aluno" | "motorista"} />}
    </div>
  );
}
