export interface Parada {
  nome: string;
  coords: [number, number];
}

export interface Rota {
  id: string;
  bairro: string;
  motorista: string;
  origem: [number, number];
  paradas: Parada[];
}

export const ROTAS: Rota[] = [
  {
    id: "aldeiaPark",
    bairro: "Aldeia Park",
    motorista: "João Silva",
    origem: [-4.181536803977927, -38.459371465206424],
    paradas: [
      { nome: "Smartfit", coords: [-4.1816, -38.4593] },
      { nome: "Sabor Divino", coords: [-4.1803, -38.4594] },
      { nome: "Dione", coords: [-4.1831, -38.4674] },
      { nome: "Coriolano", coords: [-4.1732, -38.4611] },
      { nome: "Liceu", coords: [-4.1685, -38.4630] },
    ],
  },
  {
    id: "buriti",
    bairro: "Buriti",
    motorista: "Maria Oliveira",
    origem: [-4.176983918564992, -38.481591544426514],
    paradas: [
      { nome: "Madeireira Roma", coords: [-4.176983918564992, -38.481591544426514] },
      { nome: "Marina", coords: [-4.175500619426942, -38.47292743842063] },
      { nome: "MCR Lubrificantes", coords: [-4.176903072507907, -38.478556766483585] },
      { nome: "Municipal", coords: [-4.175214072946176, -38.46862240569411] },
      { nome: "Liceu", coords: [-4.1685, -38.4630] },
    ],
  },
];

export function getBairrosUnicos(): string[] {
  return Array.from(new Set(ROTAS.map((r) => r.bairro))).sort();
}

export function getRotaPorBairro(bairro: string): Rota | undefined {
  return ROTAS.find((r) => r.bairro === bairro);
}

export function getRotaPorId(id: string): Rota | undefined {
  return ROTAS.find((r) => r.id === id);
}
