"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Início", icone: "◧" },
  { href: "/projetos", label: "Projetos", icone: "▤" },
  { href: "/analise", label: "Análise de ambiente", icone: "◉" },
  { href: "/consultor", label: "Consultor IA", icone: "✦" },
  { href: "/planta", label: "Planta baixa", icone: "⊞" },
  { href: "/moodboard", label: "Moodboard", icone: "◐" },
];

export default function Sidebar() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);

  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return (
    <>
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <span className="font-serif text-xl">Studio Interiores</span>
        <button className="btn-ghost px-3 py-1" onClick={() => setAberto(!aberto)} aria-label="Menu">
          ☰
        </button>
      </header>
      <aside
        className={`${aberto ? "block" : "hidden"} border-r border-line bg-surface md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0`}
      >
        <div className="hidden px-6 py-6 md:block">
          <div className="font-serif text-2xl leading-tight">Studio Interiores</div>
          <div className="text-xs text-muted">design de interiores com IA</div>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setAberto(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                ativo(l.href) ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-bg"
              }`}
            >
              <span className="w-5 text-center">{l.icone}</span>
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
