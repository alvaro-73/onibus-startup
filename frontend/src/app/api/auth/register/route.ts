import { NextResponse } from "next/server";

// Stub: o Firebase Admin SDK nao esta configurado (sem credenciais).
// O cadastro real ocorre no cliente via Firebase Auth (ver src/app/cadastro/page.tsx).
export async function POST() {
  return NextResponse.json(
    { error: "Endpoint nao implementado. Cadastro eh feito no cliente via Firebase Auth." },
    { status: 501 },
  );
}
