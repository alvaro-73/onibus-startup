"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import BackButton from "@/components/ui/BackButton";

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
      setErro("Firebase nao configurado na Vercel.");
      return;
    }

    try {
      setErro("");
      setLoading(true);

      const cred = await signInWithEmailAndPassword(auth, email, senha);

      const snap = await get(ref(db, `usuarios/${cred.user.uid}`));
      const dados = snap.val();

      document.cookie = `fluxbus_auth=${cred.user.uid}; path=/; max-age=2592000`;

      const next = search.get("next");

      if (next) router.push(next);
      else if (dados?.tipo === "motorista") router.push("/motorista");
      else if (dados?.tipo === "aluno") router.push("/aluno");
      else router.push("/");
    } catch {
      setErro("Email ou senha invalidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Entrar</h1>

        <form onSubmit={entrar} className="space-y-3 mt-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg"
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg"
            required
          />

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <Link href="/">Cancelar</Link>
          <Link href="/cadastro">Criar conta</Link>
        </div>
      </div>
    </div>
  );
}