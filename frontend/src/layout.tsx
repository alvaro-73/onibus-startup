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