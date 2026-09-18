"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

import { get, ref, remove, set } from "firebase/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { ROTAS, getRotaPorBairro, getRotaPorId } from "@/data/rotas";

type Posicao = {
  lat: number;
  lng: number;
};

function distanciaMetros(a: Posicao, b: Posicao) {
  const raioDaTerra = 6371000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * raioDaTerra * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

type ViagemContextType = {
  viagemAtiva: boolean;
  rotaAtivaId: string | null;
  velocidadeAtual: number;
  posicao: Posicao;
  ultimaAtualizacao: string;
  statusIA: string;
  alerta: boolean;
  usuario: User | null;

  iniciarViagem: (bairro: string) => void;
  pararViagem: () => void;
  setAlerta: (valor: boolean) => void;
};

const ViagemContext = createContext<ViagemContextType | undefined>(
  undefined
);

export function ViagemProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);

  const [viagemAtiva, setViagemAtiva] = useState(false);
  const [rotaAtivaId, setRotaAtivaId] = useState<string | null>(null);
  const viagemAtivaRef = useRef(false);
  const [velocidadeAtual, setVelocidadeAtual] = useState(0);
  const [posicao, setPosicao] = useState<Posicao>({
    lat: 0,
    lng: 0,
  });

  const [ultimaAtualizacao, setUltimaAtualizacao] = useState("-");
  const [statusIA, setStatusIA] = useState("Aguardando IA...");
  const [alerta, setAlerta] = useState(false);

  // useRef é melhor que useState para guardar o ID do GPS
  const watchIdRef = useRef<number | null>(null);

  const consultandoIARef = useRef(false);

  // Guarda a rota atual sem depender da página /motorista
  const rotaIdRef = useRef<string | null>(null);
  const proximaParadaRef = useRef(0);
  const entradaNaParadaEmRef = useRef<number | null>(null);
  const ultimaPosicaoAceitaRef = useRef<{ posicao: Posicao; em: number } | null>(null);

  // AUTH
  useEffect(() => {
    if (!firebaseConfigured) return;

    const unsub = onAuthStateChanged(auth, (u) => {
      setUsuario(u);
    });

    return () => unsub();
  }, []);

  // IA
  async function verificarDesvioIA(lat: number, lng: number) {
    if (consultandoIARef.current) return;

    const endpoint =
      process.env.NEXT_PUBLIC_IA_ENDPOINT ||
      "https://startup-onibus-ia1.onrender.com/prever";

    consultandoIARef.current = true;

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat,
          lng,
        }),
      });

      if (!resp.ok) {
        throw new Error("Erro na IA");
      }

      const dados = await resp.json();

      if (dados.alerta) {
        setAlerta(true);
        setStatusIA("🚨 Possível desvio detectado");
      } else {
        setAlerta(false);
        setStatusIA("✅ Dentro da rota");
      }
    } catch (err) {
      console.error(err);
      setStatusIA("⚠️ IA indisponível");
    } finally {
      consultandoIARef.current = false;
    }
  }

  function iniciarRastreamento(rotaId: string) {
    // Impede criar dois watchPosition
    if (watchIdRef.current !== null) {
      return;
    }

    if (!navigator.geolocation) {
      setStatusIA("⚠️ GPS não disponível");
      return;
    }

    rotaIdRef.current = rotaId;

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          if (!viagemAtivaRef.current) return;

          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const precisao = position.coords.accuracy;
          const now = position.timestamp || Date.now();

          // Leituras com baixa precisão são a principal causa de o ônibus
          // "pular" no mapa e concluir uma parada errada.
          if (!Number.isFinite(precisao) || precisao > 40) {
            setStatusIA("⚠️ Aguardando GPS mais preciso");
            return;
          }

          const posicaoAtual = { lat, lng };
          const leituraAnterior = ultimaPosicaoAceitaRef.current;
          if (leituraAnterior) {
            const metrosPercorridos = distanciaMetros(
              leituraAnterior.posicao,
              posicaoAtual
            );
            const segundosDecorridos = (now - leituraAnterior.em) / 1000;

            // Descarta saltos impossíveis, comuns em oscilação de GPS.
            if (
              segundosDecorridos > 0 &&
              (metrosPercorridos / segundosDecorridos) * 3.6 > 100
            ) {
              return;
            }
          }

          ultimaPosicaoAceitaRef.current = { posicao: posicaoAtual, em: now };

          const velocidade = position.coords.speed ?? 0;
          const velocidadeKmH = velocidade * 3.6;

          const rota = getRotaPorId(rotaId);
          const paradaAtual = rota?.paradas[proximaParadaRef.current];
          if (paradaAtual) {
            const distanciaDaParada = distanciaMetros(posicaoAtual, {
              lat: paradaAtual.coords[0],
              lng: paradaAtual.coords[1],
            });

            if (distanciaDaParada <= 50) {
              if (entradaNaParadaEmRef.current === null) {
                entradaNaParadaEmRef.current = now;
              } else if (now - entradaNaParadaEmRef.current >= 10000) {
                proximaParadaRef.current = Math.min(
                  proximaParadaRef.current + 1,
                  rota.paradas.length
                );
                entradaNaParadaEmRef.current = null;
              }
            } else {
              entradaNaParadaEmRef.current = null;
            }
          }

          setPosicao({
            lat,
            lng,
          });

          setVelocidadeAtual(velocidadeKmH);

          setUltimaAtualizacao(
            new Date(now).toLocaleTimeString()
          );

          // IA
          verificarDesvioIA(lat, lng);

          // FIREBASE
          if (!viagemAtivaRef.current) return;

          await set(ref(db, `onibus/${rotaId}`), {
            lat,
            lng,
            speed: velocidade,
            speedKmH: velocidadeKmH,
            precisao,
            proximaParada: proximaParadaRef.current,

            atualizadoEm: now,

            motoristaId: auth.currentUser?.uid ?? null,
            motorista: auth.currentUser?.email ?? "",

            viagemAtiva: true,
            aguardandoGps: false,
          });

          // HISTÓRICO
          await set(
            ref(db, `historico/${rotaId}/${now}`),
            {
              lat,
              lng,

              speed: velocidade,
              speedKmH: velocidadeKmH,

              timestamp: now,

              rota: rotaId,
            }
          );
        } catch (err) {
          console.error("Erro ao atualizar viagem:", err);
        }
      },

      (err) => {
        console.error("Erro de localização:", err);

        setStatusIA(
          "⚠️ Erro ao obter localização"
        );
      },

      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;
  }

  // INICIAR VIAGEM
  function iniciarViagem(bairro: string) {
    if (!firebaseConfigured) return;

    if (watchIdRef.current !== null) {
      return;
    }

    const rota =
      getRotaPorBairro(bairro) ?? ROTAS[0];

    if (!rota) return;

    rotaIdRef.current = rota.id;
    proximaParadaRef.current = 0;
    entradaNaParadaEmRef.current = null;
    ultimaPosicaoAceitaRef.current = null;
    setRotaAtivaId(rota.id);

    viagemAtivaRef.current = true;
    setViagemAtiva(true);

    // Guarda no navegador
    localStorage.setItem("viagemAtiva", "true");
    localStorage.setItem(
      "rotaViagemAtiva",
      rota.id
    );

    // Exibe o ônibus imediatamente na origem da rota. A primeira posição do
    // GPS substitui esse ponto inicial assim que estiver disponível.
    void set(ref(db, `onibus/${rota.id}`), {
      lat: rota.origem[0],
      lng: rota.origem[1],
      viagemAtiva: true,
      aguardandoGps: true,
      proximaParada: 0,
      atualizadoEm: Date.now(),
      motoristaId: auth.currentUser?.uid ?? null,
      motorista: auth.currentUser?.email ?? "",
    }).catch((err) => {
      console.error("Erro ao iniciar viagem no Firebase:", err);
    });

    iniciarRastreamento(rota.id);
  }

  // PARAR VIAGEM
  async function pararViagem() {
    const rotaId = rotaIdRef.current;

    viagemAtivaRef.current = false;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    setViagemAtiva(false);
    setRotaAtivaId(null);
    setVelocidadeAtual(0);
    proximaParadaRef.current = 0;
    entradaNaParadaEmRef.current = null;
    ultimaPosicaoAceitaRef.current = null;

    localStorage.removeItem("viagemAtiva");
    localStorage.removeItem("rotaViagemAtiva");

    if (rotaId && firebaseConfigured) {
      try {
        // Remove a última localização ao encerrar. Assim, nenhuma posição
        // antiga pode continuar aparecendo para os alunos.
        await remove(ref(db, `onibus/${rotaId}`));
      } catch (err) {
        console.error(
          "Erro ao remover ônibus do Firebase:",
          err
        );
      }
    }

    rotaIdRef.current = null;
  }

  // RETOMA A VIAGEM APÓS F5
  useEffect(() => {
    if (!firebaseConfigured) return;

    const ativa =
      localStorage.getItem("viagemAtiva");

    const rotaId =
      localStorage.getItem("rotaViagemAtiva");

    if (
      ativa === "true" &&
      rotaId &&
      watchIdRef.current === null
    ) {
      void get(ref(db, `onibus/${rotaId}`)).then((snapshot) => {
        const proximaParada = Number(snapshot.val()?.proximaParada);
        proximaParadaRef.current = Number.isInteger(proximaParada)
          ? Math.max(0, proximaParada)
          : 0;

        rotaIdRef.current = rotaId;
        setRotaAtivaId(rotaId);
        viagemAtivaRef.current = true;
        setViagemAtiva(true);
        iniciarRastreamento(rotaId);
      });
    }
  }, []);

  return (
    <ViagemContext.Provider
      value={{
        viagemAtiva,
        rotaAtivaId,
        velocidadeAtual,
        posicao,
        ultimaAtualizacao,
        statusIA,
        alerta,
        usuario,

        iniciarViagem,
        pararViagem,
        setAlerta,
      }}
    >
      {children}
    </ViagemContext.Provider>
  );
}

export function useViagem() {
  const contexto = useContext(ViagemContext);

  if (!contexto) {
    throw new Error(
      "useViagem precisa estar dentro de ViagemProvider"
    );
  }

  return contexto;
}
