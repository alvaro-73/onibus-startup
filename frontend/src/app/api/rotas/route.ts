import { NextResponse } from "next/server";

type Coordenada = [number, number];

function coordenadasValidas(valor: unknown): valor is Coordenada[] {
  return (
    Array.isArray(valor) &&
    valor.length >= 2 &&
    valor.every(
      (coordenada) =>
        Array.isArray(coordenada) &&
        coordenada.length === 2 &&
        coordenada.every(
          (numero) => typeof numero === "number"
        )
    )
  );
}

export async function POST(request: Request) {
  const apiKey =
    process.env.ORS_API_KEY ??
    process.env.NEXT_PUBLIC_ORS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        erro: "Chave do OpenRouteService não configurada.",
      },
      { status: 503 }
    );
  }

  let body: { coordinates?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        erro: "Dados de rota inválidos.",
      },
      { status: 400 }
    );
  }

  if (!coordenadasValidas(body.coordinates)) {
    return NextResponse.json(
      {
        erro: "Coordenadas de rota inválidas.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      "https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: body.coordinates,
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        erro: "Não foi possível conectar ao OpenRouteService.",
      },
      { status: 502 }
    );
  }
}