"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import Shell from "@/components/layout/Shell";
import BackButton from "@/components/ui/BackButton";
import EnvWarning from "@/components/ui/EnvWarning";
import { getFirebaseAuth, getFirebaseDb, firebaseConfigured } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) {
      setErro("Serviço indisponível. Verifique a configuração do Firebase.");
      return;
    }
    try {
      setErro("");
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const snap = await get(ref(db, `usuarios/${cred.user.uid}`));
      const dados = snap.val();
      if (dados?.tipo === "motorista") router.push("/motorista");
      else if (dados?.tipo === "aluno") router.push("/aluno");
      else router.push("/");
    } catch {
      setErro("Email ou senha invalidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell hideBottomNav>
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <BackButton href="/" />
        {!firebaseConfigured && (
          <EnvWarning message="Autenticação indisponível: variáveis do Firebase não configuradas." />
        )}
        <form
          onSubmit={entrar}
          className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-center text-2xl font-bold text-slate-900">Entrar</h1>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600"
          />
          <input
            type="password"
            required
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600"
          />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <Link
            href="/cadastro"
            className="text-center text-sm font-medium text-green-700 hover:underline"
          >
            Não possui conta? Criar conta
          </Link>
        </form>
      </div>
    </Shell>
  );
}
