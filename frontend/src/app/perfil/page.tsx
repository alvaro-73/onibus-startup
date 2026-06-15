"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateEmail, updateProfile, deleteUser, signOut } from "firebase/auth";
import { ref, set, remove, get } from "firebase/database";
import { X } from "lucide-react";
import Shell from "@/components/layout/Shell";
import Avatar from "@/components/ui/Avatar";
import EnvWarning from "@/components/ui/EnvWarning";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { useAuthUser } from "@/lib/useAuthUser";

export default function PerfilPage() {
  const router = useRouter();
  const { user, papel, nome, loading, configurado } = useAuthUser();
  const [nomeEdit, setNomeEdit] = useState("");
  const [emailEdit, setEmailEdit] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm1, setConfirm1] = useState(false);
  const [confirm2, setConfirm2] = useState(false);

  useEffect(() => {
    if (!loading && configurado && !user) router.push("/login");
  }, [loading, user, configurado, router]);

  useEffect(() => {
    setNomeEdit(nome ?? "");
    setEmailEdit(user?.email ?? "");
  }, [nome, user]);

  if (!configurado) {
    return (
      <Shell>
        <EnvWarning message="Firebase não configurado. Verifique o arquivo .env.local." />
      </Shell>
    );
  }

  async function salvar() {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    try {
      setMsg(null);
      const dadosAtuais = (await get(ref(db, `usuarios/${user.uid}`))).val() ?? {};
      await set(ref(db, `usuarios/${user.uid}`), {
        ...dadosAtuais,
        nome: nomeEdit,
        email: emailEdit,
      });
      if (user.displayName !== nomeEdit) await updateProfile(user, { displayName: nomeEdit });
      if (user.email !== emailEdit) await updateEmail(user, emailEdit);
      setMsg("Alterações salvas.");
    } catch (err) {
      setMsg((err as Error).message ?? "Erro ao salvar.");
    }
  }

  async function deletarConta() {
    if (!user) return;
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) return;
    try {
      await remove(ref(db, `usuarios/${user.uid}`));
      await deleteUser(user);
      router.push("/");
    } catch (err) {
      setMsg((err as Error).message ?? "Erro ao excluir conta.");
      setConfirm1(false);
      setConfirm2(false);
    }
  }

  async function handleSair() {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    router.push("/");
  }

  return (
    <Shell>
      <section className="mx-auto w-full max-w-xl px-4 py-6">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6">
          <Avatar uid={user?.uid} nome={nome ?? user?.displayName} email={user?.email} size={80} />
          <p className="text-lg font-bold text-slate-900">{nome ?? user?.email}</p>
          {papel && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold capitalize text-green-700">
              {papel}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6">
          <label className="text-sm font-semibold text-slate-700">Nome</label>
          <input
            value={nomeEdit}
            onChange={(e) => setNomeEdit(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600"
          />
          <label className="text-sm font-semibold text-slate-700">Email</label>
          <input
            type="email"
            value={emailEdit}
            onChange={(e) => setEmailEdit(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-green-600"
          />
          {msg && <p className="text-sm text-slate-600">{msg}</p>}
          <div className="flex gap-2">
            <button
              onClick={salvar}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700"
            >
              Salvar alterações
            </button>
            <button
              onClick={handleSair}
              className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-red-200 bg-white p-6">
          <h2 className="font-semibold text-red-700">Zona de perigo</h2>
          <p className="mt-1 text-sm text-slate-600">
            A exclusão da conta remove permanentemente seus dados.
          </p>
          <button
            onClick={() => setConfirm1(true)}
            className="mt-3 rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Deletar conta
          </button>
        </div>
      </section>

      {confirm1 && (
        <Modal onClose={() => setConfirm1(false)}>
          <h3 className="text-lg font-bold text-slate-900">Excluir conta?</h3>
          <p className="mt-2 text-sm text-slate-600">
            Tem certeza de que deseja excluir sua conta? Esta ação é irreversível.
          </p>
          <button
            onClick={() => {
              setConfirm1(false);
              setConfirm2(true);
            }}
            className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
          >
            Sim, quero excluir
          </button>
        </Modal>
      )}

      {confirm2 && (
        <Modal onClose={() => setConfirm2(false)}>
          <h3 className="text-lg font-bold text-slate-900">Confirme novamente</h3>
          <p className="mt-2 text-sm text-slate-600">
            Todos os seus dados e rotas serão permanentemente removidos. Confirme novamente.
          </p>
          <button
            onClick={deletarConta}
            className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
          >
            Sim, excluir minha conta
          </button>
        </Modal>
      )}
    </Shell>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
