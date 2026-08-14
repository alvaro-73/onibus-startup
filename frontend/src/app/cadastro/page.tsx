"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { camposObrigatorios, isEmail, isSenhaForte } from "@/lib/validators";
import BackButton from "@/components/ui/BackButton";

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
    if (!firebaseConfigured) {
      setErro("Servico indisponivel. Configure as variaveis NEXT_PUBLIC_FIREBASE_* em .env.local.");
      return;
    }
    if (!camposObrigatorios(nome, email, senha, confirmar)) return setErro("Preencha todos os campos.");
    if (!isEmail(email)) return setErro("Email invalido.");
    if (!isSenhaForte(senha)) return setErro("A senha deve ter ao menos 6 caracteres.");
    if (senha !== confirmar) return setErro("As senhas nao coincidem.");

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await set(ref(db, `usuarios/${cred.user.uid}`), { nome, email, tipo });
      document.cookie = `fluxbus_auth=${cred.user.uid}; path=/; max-age=2592000`;
      router.push(tipo === "motorista" ? "/motorista" : "/aluno");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar";
      setErro(msg);
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
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Criar conta</h1>
        <p className="text-sm text-slate-600 mb-6">Cadastre-se na Fluxbus.</p>

        <form onSubmit={cadastrar} className="space-y-3">
          <input
            type="text"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue"
            required
          />
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
          <input
            type="password"
            placeholder="Confirmar senha"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue"
            required
          />

          <div>
            <label className="text-sm text-slate-700 mb-1 block">Tipo de usuario</label>
            <div className="flex gap-2">
              {(["aluno", "motorista"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 py-2 rounded-lg border text-sm capitalize ${
                    tipo === t
                      ? "border-fluxbus-blue bg-fluxbus-blue text-white"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fluxbus-blue text-white py-3 rounded-lg font-semibold hover:bg-fluxbus-blue-600 disabled:opacity-60"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/" className="text-slate-600 hover:underline">
            Cancelar
          </Link>
          <Link href="/login" className="text-fluxbus-blue hover:underline">
            Ja tenho conta
          </Link>
        </div>
      </div>
    </div>
  );
}
