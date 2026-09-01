import BackButton from "@/components/ui/BackButton";

export const metadata = { title: "Sobre nos - Fluxbus" };

export default function SobrePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Sobre a Fluxbus</h1>
      <p className="text-slate-700 leading-relaxed mb-4">
        A Fluxbus e uma plataforma de mobilidade urbana voltada ao transporte escolar,
        que conecta alunos e motoristas atraves de rastreamento em tempo real, estimativas
        de chegada e deteccao automatica de desvios de rota.
      </p>
      <p className="text-slate-700 leading-relaxed mb-4">
        Nossa missao e tornar o trajeto entre casa e escola mais previsivel, seguro e
        eficiente, combinando dados de geolocalizacao, calculo de rotas e inteligencia
        artificial para apoiar motoristas e tranquilizar familias.
      </p>
      <p className="text-slate-700 leading-relaxed">
        A plataforma e desenvolvida com Next.js, Firebase, Leaflet e OpenRouteService.
      </p>
    </div>
  );
}
