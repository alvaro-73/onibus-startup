import Shell from "@/components/layout/Shell";
import BackButton from "@/components/ui/BackButton";

export const metadata = {
  title: "Sobre nós - Fluxbus",
};

export default function SobrePage() {
  return (
    <Shell hideBottomNav>
      <section className="mx-auto w-full max-w-3xl px-4 py-8">
        <BackButton href="/" />
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Sobre o Fluxbus</h1>
        <p className="mt-3 text-slate-700">
          O Fluxbus é uma plataforma de mobilidade urbana focada em transporte escolar.
          Conectamos alunos, motoristas e operações em torno de informação em tempo real,
          tornando o trajeto mais previsível e seguro.
        </p>
        <h2 className="mt-6 text-xl font-semibold text-slate-900">Nossa missão</h2>
        <p className="mt-2 text-slate-700">
          Democratizar o acompanhamento de rotas escolares com tecnologia simples e acessível,
          reduzindo atrasos e aumentando a tranquilidade das famílias.
        </p>
        <h2 className="mt-6 text-xl font-semibold text-slate-900">Como funciona</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          <li>Motoristas registram a viagem em tempo real via GPS.</li>
          <li>Alunos acompanham a posição do ônibus e o tempo até cada parada.</li>
          <li>Uma camada de IA monitora desvios e ajuda a operação.</li>
        </ul>
      </section>
    </Shell>
  );
}
