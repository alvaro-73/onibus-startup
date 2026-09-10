"use client";

function hashToColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  const r = (hash & 0xff).toString(16).padStart(2, "0");
  const g = ((hash >> 8) & 0xff).toString(16).padStart(2, "0");
  const b = ((hash >> 16) & 0xff).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function iniciais(nome: string | null | undefined, email: string | null | undefined): string {
  const base = (nome || email || "?").trim();
  const partes = base.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return (partes[0]![0]! + partes[partes.length - 1]![0]!).toUpperCase();
}

type Props = {
  uid: string;
  nome?: string | null;
  email?: string | null;
  size?: number;
  onClick?: () => void;
};

export default function Avatar({ uid, nome, email, size = 32, onClick }: Props) {
  const bg = hashToColor(uid);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Conta do usuario"
      className="inline-flex items-center justify-center rounded-full text-white font-semibold select-none focus:outline-none focus:ring-2 focus:ring-fluxbus-blue"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
    >
      {iniciais(nome, email)}
    </button>
  );
}
