"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db, firebaseConfigured } from "./firebase";

export type TipoUsuario = "aluno" | "motorista" | null;

export interface AuthState {
  user: User | null;
  tipo: TipoUsuario;
  nome: string | null;
  loading: boolean;
  configured: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [tipo, setTipo] = useState<TipoUsuario>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await get(ref(db, `usuarios/${u.uid}`));
          const dados = snap.val();
          setTipo((dados?.tipo as TipoUsuario) ?? null);
          setNome(dados?.nome ?? null);
        } catch {
          setTipo(null);
          setNome(null);
        }
      } else {
        setTipo(null);
        setNome(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, tipo, nome, loading, configured: firebaseConfigured };
}
