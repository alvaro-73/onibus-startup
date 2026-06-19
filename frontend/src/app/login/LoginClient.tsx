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

    if (!firebaseConfigured) {
      setErro("Servico de autenticacao indisponivel. Configure as variaveis NEXT_PUBLIC_FIREBASE_* em .env.local.");
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
        <p className="text-sm text-slate-600 mb-6">Acesse sua conta Fluxbus.</p>

        <form onSubmit={entrar} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue"
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue"
            required
          />

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fluxbus-blue text-white py-3 rounded-lg font-semibold hover:bg-fluxbus-blue-600 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/" className="text-slate-600 hover:underline">
            Cancelar
          </Link>
          <Link href="/cadastro" className="text-fluxbus-blue hover:underline">
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}