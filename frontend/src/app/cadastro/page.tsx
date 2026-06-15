"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import Shell from "@/components/layout/Shell";
import BackButton from "@/components/ui/BackButton";
import EnvWarning from "@/components/ui/EnvWarning";
import { getFirebaseAuth, getFirebaseDb, firebaseConfigured } from "@/lib/firebase";
import { isEmailValido, isNomeValido, isSenhaValida } from "@/lib/validators";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [tipo, setTipo] = useState<"aluno" | "motorista">("aluno");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!isNomeValido(nome)) return setErro("Informe um nome válido.");
    if (!isEmailValido(email)) return setErro("Email inválido.");
    if (!isSenhaValida(senha)) return setErro("A senha deve ter ao menos 6 caracteres.");
    if (senha !== confirmar) return setErro("As senhas não coincidem.");

    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) {
      setErro("Serviço indisponível. Verifique a configuração do Firebase.");
      return;
    }

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await set(ref(db, `usuarios/${cred.user.uid}`), { nome, email, tipo });
      router.push(tipo === "motorista" ? "/motorista" : "/aluno");
    } catch (err) {
      setErro((err as Error).message ?? "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell hideBottomNav>
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <BackButton href="/login" />
        {!firebaseConfigured && (
          <EnvWarning message="Cadastro indisponível: variáveis do Firebase não configuradas." />
        )}
        <form
          onSubmit={cadastrar}
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-center text-2xl font-bold text-slate-900">Criar conta</h1>

          <input
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600"
          />
          <input
            type="password"
            placeholder="Confirmar senha"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600"
          />

          <div className="flex gap-2">
            {(["aluno", "motorista"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${
                  tipo === t
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-300 text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="mt-2 flex gap-2">
            <Link
              href="/login"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {loading ? "Criando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
