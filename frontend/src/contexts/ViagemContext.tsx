"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

import { ref, set } from "firebase/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import { ROTAS, getRotaPorBairro } from "@/data/rotas";

type Posicao = {
  lat: number;
  lng: number;
};

type ViagemContextType = {
  viagemAtiva: boolean;
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
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const velocidade = position.coords.speed ?? 0;
          const velocidadeKmH = velocidade * 3.6;

          const now = Date.now();

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
          await set(ref(db, `onibus/${rotaId}`), {
            lat,
            lng,
            speed: velocidade,
            speedKmH: velocidadeKmH,

            atualizadoEm: now,

            motoristaId: auth.currentUser?.uid ?? null,
            motorista: auth.currentUser?.email ?? "",

            viagemAtiva: true,
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

    setViagemAtiva(true);

    // Guarda no navegador
    localStorage.setItem("viagemAtiva", "true");
    localStorage.setItem(
      "rotaViagemAtiva",
      rota.id
    );

    iniciarRastreamento(rota.id);
  }

  // PARAR VIAGEM
  async function pararViagem() {
    const rotaId = rotaIdRef.current;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    setViagemAtiva(false);
    setVelocidadeAtual(0);

    localStorage.removeItem("viagemAtiva");
    localStorage.removeItem("rotaViagemAtiva");

    if (rotaId && firebaseConfigured) {
      try {
        await set(
          ref(db, `onibus/${rotaId}/viagemAtiva`),
          false
        );
      } catch (err) {
        console.error(
          "Erro ao encerrar viagem no Firebase:",
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
      rotaIdRef.current = rotaId;

      setViagemAtiva(true);

      iniciarRastreamento(rotaId);
    }
  }, []);

  return (
    <ViagemContext.Provider
      value={{
        viagemAtiva,
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