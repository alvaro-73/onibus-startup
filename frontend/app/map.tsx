"use client";

import { useState } from "react";
import MapComponent from "@/components/MapComponent";

type Parada = {
  nome: string;
  coords: [number, number];
};

export default function MapPage() {
  const origem: [number, number] = [-3.867, -38.624]; // exemplo (Pacajus)

  const paradasBase: Parada[] = [
    { nome: "Parada 1", coords: [-3.868, -38.625] },
    { nome: "Parada 2", coords: [-3.869, -38.626] },
  ];

  const [rota] = useState<Parada[]>(paradasBase);

  return (
    <div style={{ padding: 20 }}>
      <h1>Mapa de Rotas</h1>

      <MapComponent origem={origem} paradas={rota} />
    </div>
  );
}