import { NextResponse } from "next/server";

// Stub: leitura/escrita de posicao do onibus eh feita diretamente no cliente
// via Firebase Realtime Database (sem Admin SDK).
export async function GET(_req: Request, { params }: { params: Promise<{ rota: string }> }) {
  const { rota } = await params;
  return NextResponse.json(
    { error: "Endpoint nao implementado.", rota },
    { status: 501 },
  );
}
