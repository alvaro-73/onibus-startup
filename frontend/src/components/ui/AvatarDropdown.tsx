"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";

type Props = {
  uid: string;
  nome?: string | null;
  email?: string | null;
  onSair: () => void;
};

export default function AvatarDropdown({ uid, nome, email, onSair }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Avatar uid={uid} nome={nome} email={email} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSair();
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
