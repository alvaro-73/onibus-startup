"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = { fallbackHref?: string };

export default function BackButton({ fallbackHref = "/" }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="inline-flex items-center gap-2 text-sm text-fluxbus-blue hover:underline"
      aria-label="Voltar"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Voltar
    </button>
  );
}
