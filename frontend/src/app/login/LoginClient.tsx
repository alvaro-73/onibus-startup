"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db, firebaseConfigured } from "@/lib/firebase";

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();

    if (!firebaseConfigured || !auth || !db) {
      setErro("Firebase não configurado");
      return;
    }

    try {
      setLoading(true);
      setErro("");

      const cred = await signInWithEmailAndPassword(auth, email, senha);

      const snap = await get(ref(db, `usuarios/${cred.user.uid}`));
      const dados = snap.val();

      // COOKIE (continua igual)
      document.cookie = `fluxbus_auth=${cred.user.uid}; path=/; max-age=2592000`;

      const next = search.get("next");

      const destino =
        next ??
        (dados?.tipo === "motorista"
          ? "/motorista"
          : dados?.tipo === "aluno"
          ? "/aluno"
          : "/");

      // 🔥 IMPORTANTE: força refresh do estado do app
      router.push(destino);
      router.refresh(); // <<< ISSO resolve seu problema

    } catch (err) {
      setErro("Email ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <form onSubmit={entrar} className="space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 border rounded-lg"
        />

        <input
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          type="password"
          placeholder="Senha"
          className="w-full px-4 py-3 border rounded-lg"
        />

        {erro && <p className="text-red-500 text-sm">{erro}</p>}

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}