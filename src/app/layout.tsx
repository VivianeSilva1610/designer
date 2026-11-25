import type { Metadata } from "next";
import { Geist, DM_Serif_Display } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const serif = DM_Serif_Display({ variable: "--font-serif-display", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Studio Interiores",
  description: "Projetos, análise de ambientes, planta baixa e moodboards com IA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} ${serif.variable} antialiased`}>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
