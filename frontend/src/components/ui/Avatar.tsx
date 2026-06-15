"use client";

import { colorFromId, iniciais } from "@/lib/avatar";

interface Props {
  uid: string | null | undefined;
  nome?: string | null;
  email?: string | null;
  size?: number;
  onClick?: () => void;
}

export default function Avatar({ uid, nome, email, size = 32, onClick }: Props) {
  const bg = colorFromId(uid ?? email ?? "anon");
  const letters = iniciais(nome, email);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir menu do usuário"
      className="inline-flex items-center justify-center rounded-full text-white font-semibold select-none focus:outline-none focus:ring-2 focus:ring-green-500"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {letters}
    </button>
  );
}
