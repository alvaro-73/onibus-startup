"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => (href ? router.push(href) : router.back())}
      className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-800"
      type="button"
    >
      <ArrowLeft size={18} /> Voltar
    </button>
  );
}
