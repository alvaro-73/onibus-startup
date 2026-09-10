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

    setErro("");

    // Verifica se o Firebase está configurado
    if (!firebaseConfigured || !auth || !db) {
      setErro("Firebase não configurado corretamente.");
      return;
    }

    try {
      setLoading(true);

      // =========================================================
      // 1. AUTENTICAÇÃO
      // =========================================================

      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );

      const usuario = cred.user;

      console.log("✅ Firebase Auth: login realizado");
      console.log("UID:", usuario.uid);
      console.log("Email:", usuario.email);

      // =========================================================
      // 2. BUSCAR DADOS DO USUÁRIO NO REALTIME DATABASE
      // =========================================================

      let dados: any = null;

      try {
        const usuarioRef = ref(db, `usuarios/${usuario.uid}`);
        const snap = await get(usuarioRef);

        if (snap.exists()) {
          dados = snap.val();

          console.log("✅ Dados do usuário encontrados:", dados);
        } else {
          console.warn(
            "⚠️ Usuário autenticado, mas não existe em /usuarios/"
          );
        }
      } catch (databaseError) {
        console.error(
          "❌ ERRO AO ACESSAR O REALTIME DATABASE:",
          databaseError
        );

        setErro(
          "Login realizado, mas não foi possível acessar os dados da sua conta."
        );

        return;
      }

      // =========================================================
      // 3. CRIAR COOKIE DE SESSÃO
      // =========================================================

      document.cookie = [
        `fluxbus_auth=${usuario.uid}`,
        "path=/",
        "max-age=2592000",
        "SameSite=Lax",
      ].join("; ");

      console.log("✅ Cookie de sessão criado");

      // =========================================================
      // 4. DEFINIR PARA ONDE O USUÁRIO SERÁ ENVIADO
      // =========================================================

      const next = search.get("next");

      let destino = next;

      if (!destino) {
        if (dados?.tipo === "motorista") {
          destino = "/motorista";
        } else if (dados?.tipo === "aluno") {
          destino = "/aluno";
        } else {
          destino = "/";
        }
      }

      console.log("➡️ Redirecionando para:", destino);

      // =========================================================
      // 5. REDIRECIONAR
      // =========================================================

      router.push(destino);
      router.refresh();

    } catch (error: any) {
      console.error("❌ ERRO NO LOGIN:", error);

      // =========================================================
      // ERROS DO FIREBASE AUTH
      // =========================================================

      const codigo = error?.code;

      switch (codigo) {
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
          setErro("E-mail ou senha inválidos.");
          break;

        case "auth/user-not-found":
          setErro("E-mail ou senha inválidos.");
          break;

        case "auth/wrong-password":
          setErro("E-mail ou senha inválidos.");
          break;

        case "auth/invalid-email":
          setErro("Digite um e-mail válido.");
          break;

        case "auth/user-disabled":
          setErro("Esta conta foi desativada.");
          break;

        case "auth/too-many-requests":
          setErro(
            "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."
          );
          break;

        case "auth/network-request-failed":
          setErro(
            "Não foi possível conectar ao Firebase. Verifique sua internet."
          );
          break;

        default:
          setErro(
            "Não foi possível realizar o login. Tente novamente."
          );
          break;
      }

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">

      {/* BOTÃO VOLTAR */}
      <div className="mb-4">
        <BackButton />
      </div>

      {/* CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">

        {/* TÍTULO */}
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Entrar
        </h1>

        <p className="text-sm text-slate-600 mb-6">
          Acesse sua conta Fluxbus.
        </p>

        {/* FORMULÁRIO */}
        <form onSubmit={entrar} className="space-y-3">

          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue"
            autoComplete="email"
            required
          />

          {/* SENHA */}
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fluxbus-blue"
            autoComplete="current-password"
            required
          />

          {/* ERRO */}
          {erro && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">
                {erro}
              </p>
            </div>
          )}

          {/* BOTÃO */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fluxbus-blue text-white py-3 rounded-lg font-semibold hover:bg-fluxbus-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

        </form>

        {/* LINKS */}
        <div className="mt-4 flex items-center justify-between text-sm">

          <Link
            href="/"
            className="text-slate-600 hover:underline"
          >
            Cancelar
          </Link>

          <Link
            href="/cadastro"
            className="text-fluxbus-blue hover:underline"
          >
            Criar conta
          </Link>

        </div>

      </div>
    </div>
  );
}