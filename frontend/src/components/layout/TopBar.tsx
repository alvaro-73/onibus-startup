"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { MoreVertical, LogOut, User as UserIcon, Info } from "lucide-react";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuthUser } from "@/lib/useAuthUser";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/ui/Avatar";

export default function TopBar() {
  const { user, nome } = useAuthUser();
  const router = useRouter();
  const [openAvatar, setOpenAvatar] = useState(false);
  const [openMore, setOpenMore] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpenAvatar(false);
        setOpenMore(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function handleSair() {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <Logo size={28} />
      <div className="flex items-center gap-2" ref={ref}>
        {!user ? (
          <Link
            href="/login"
            className="rounded-md border border-green-600 px-4 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            Entrar
          </Link>
        ) : (
          <>
            <div className="relative">
              <Avatar
                uid={user.uid}
                nome={nome ?? user.displayName}
                email={user.email}
                size={32}
                onClick={() => {
                  setOpenAvatar((v) => !v);
                  setOpenMore(false);
                }}
              />
              {openAvatar && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <Link
                    href="/perfil"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => setOpenAvatar(false)}
                  >
                    <UserIcon size={16} /> Perfil
                  </Link>
                  <button
                    onClick={handleSair}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                aria-label="Mais opções"
                className="rounded-md p-1.5 hover:bg-slate-100"
                onClick={() => {
                  setOpenMore((v) => !v);
                  setOpenAvatar(false);
                }}
              >
                <MoreVertical size={20} />
              </button>
              {openMore && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <Link
                    href="/sobre"
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => setOpenMore(false)}
                  >
                    <Info size={16} /> Sobre nós
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
