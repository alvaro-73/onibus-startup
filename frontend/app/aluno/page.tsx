"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

export default function TesteAluno() {
  const [onibus, setOnibus] = useState<any>(null);
  const [historico, setHistorico] = useState<any>(null);

  useEffect(() => {
    const rota = "aldeiaPark";

    const onibusRef = ref(db, `onibus/${rota}`);
    const histRef = ref(db, `historico/${rota}`);

    const unsub1 = onValue(onibusRef, (snap) => {
      console.log("ONIBUS RAW:", snap.val());
      setOnibus(snap.val());
    });

    const unsub2 = onValue(histRef, (snap) => {
      console.log("HISTORICO RAW:", snap.val());
      setHistorico(snap.val());
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>🧪 TESTE FIREBASE</h1>

      <h2>🚍 Ônibus atual</h2>
      <pre>{JSON.stringify(onibus, null, 2)}</pre>

      <h2>📜 Histórico</h2>
      <pre>{JSON.stringify(historico, null, 2)}</pre>
    </div>
  );
}