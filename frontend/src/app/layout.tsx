import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "7bar - Ponto de Venda",
  description: "SaaS Premium para Adegas e Distribuidoras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-white antialiased overflow-hidden`}>
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
