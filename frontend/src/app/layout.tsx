import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Fluxbus - Mobilidade Urbana",
  description: "Plataforma de transporte escolar com rastreamento em tempo real.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Adicionado suppressHydrationWarning aqui
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <body 
        className="min-h-full bg-white text-slate-900 antialiased" 
        suppressHydrationWarning // E adicionado aqui também para proteger o body
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
import "./globals.css";
import { ViagemProvider } from "@/contexts/ViagemContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ViagemProvider>
          {children}
        </ViagemProvider>
      </body>
    </html>
  );
}