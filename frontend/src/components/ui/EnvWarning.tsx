export default function EnvWarning({ message }: { message: string }) {
  return (
    <div className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Configuração necessária</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2 text-xs text-amber-800">
        Copie <code>.env.example</code> para <code>.env.local</code> e preencha as chaves.
      </p>
    </div>
  );
}
