"use client";

import Link from "next/link";
import { useProjetos } from "@/lib/store";
import { STATUS_LABEL, brl, resumoAmbientes, totalItens } from "@/lib/types";

const ATALHOS = [
  { href: "/analise", titulo: "Analisar um ambiente", texto: "Envie uma foto e receba sugestões, paleta e lista de móveis." },
  { href: "/consultor", titulo: "Conversar com o consultor", texto: "Tire dúvidas de decoração, materiais, medidas e iluminação." },
  { href: "/planta", titulo: "Desenhar planta baixa", texto: "Monte o layout do cômodo com móveis em escala." },
  { href: "/moodboard", titulo: "Criar moodboard", texto: "Junte cores e referências para apresentar ao cliente." },
];

export default function Inicio() {
  const { projetos } = useProjetos();
  const ativos = projetos.filter((p) => p.status !== "concluido");
  const orcamento = ativos.reduce((s, p) => s + (p.orcamento || 0), 0);
  const especificado = ativos.reduce((s, p) => s + totalItens(p), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="h1">Olá! 👋</h1>
        <p className="text-muted">Aqui está o resumo do seu estúdio.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="label">Projetos ativos</div>
          <div className="text-3xl font-semibold">{ativos.length}</div>
        </div>
        <div className="card">
          <div className="label">Orçamento em projetos ativos</div>
          <div className="text-3xl font-semibold">{brl(orcamento)}</div>
        </div>
        <div className="card">
          <div className="label">Já especificado em itens</div>
          <div className="text-3xl font-semibold">{brl(especificado)}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ATALHOS.map((a) => (
          <Link key={a.href} href={a.href} className="card transition hover:border-accent">
            <div className="mb-1 font-medium">{a.titulo}</div>
            <div className="text-sm text-muted">{a.texto}</div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl">Projetos recentes</h2>
          <Link href="/projetos" className="btn-ghost">Ver todos</Link>
        </div>
        {projetos.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum projeto ainda.{" "}
            <Link href="/projetos" className="text-accent underline">Crie o primeiro</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {projetos.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link href={`/projetos/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-accent">
                  <span>
                    <span className="font-medium">{p.nome}</span>
                    <span className="text-sm text-muted"> · {p.cliente || "sem cliente"} · {resumoAmbientes(p)}</span>
                  </span>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">{STATUS_LABEL[p.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
