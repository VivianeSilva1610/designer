"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { reduzirImagem, useProjetos } from "@/lib/store";
import type { Moodboard } from "@/lib/types";

const VAZIO: Moodboard = { cores: [], imagens: [], notas: "" };

function Editor() {
  const busca = useSearchParams();
  const { projetos, atualizar } = useProjetos();
  const [projetoId, setProjetoId] = useState(busca.get("projeto") ?? "");
  const [board, setBoard] = useState<Moodboard>(VAZIO);
  const [novaCor, setNovaCor] = useState("#a0673f");
  const [nomeCor, setNomeCor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState("");

  const projeto = projetos.find((p) => p.id === projetoId);
  // ao escolher outro projeto, carrega o moodboard dele (ajuste feito na renderização)
  const [projetoVisto, setProjetoVisto] = useState<string | undefined>(undefined);
  if (projeto && projeto.id !== projetoVisto) {
    setProjetoVisto(projeto.id);
    setBoard(projeto.moodboard ?? VAZIO);
    const ambientes = projeto.ambientes.map((a) => a.nome).join(", ") || "projeto residencial";
    setDescricao(`${ambientes}; estilo ${projeto.estilo}. ${projeto.notas}`.trim());
  }

  async function adicionarImagens(arquivos: FileList | null) {
    if (!arquivos) return;
    const novas = await Promise.all(Array.from(arquivos).map((f) => reduzirImagem(f, 640, 0.7)));
    setBoard((b) => ({ ...b, imagens: [...b.imagens, ...novas] }));
  }

  async function gerarPaleta() {
    if (!descricao.trim()) return;
    setGerando(true);
    setAviso("");
    try {
      const r = await fetch("/api/paleta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ descricao }) });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro);
      setBoard((b) => ({ ...b, cores: dados.cores, notas: b.notas || dados.conceito }));
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "Erro ao gerar paleta");
    } finally {
      setGerando(false);
    }
  }

  function salvar() {
    if (!projetoId) {
      setAviso("Escolha um projeto para salvar o moodboard.");
      return;
    }
    atualizar(projetoId, (p) => ({ ...p, moodboard: board }));
    setAviso("Moodboard salvo no projeto ✔");
    setTimeout(() => setAviso(""), 2500);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="h1">Moodboard</h1>
          <p className="text-sm text-muted">Junte referências e cores para apresentar o conceito ao cliente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-56" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
            <option value="">— sem projeto —</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <button className="btn" onClick={salvar}>Salvar no projeto</button>
          <button className="btn-ghost" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>
      {aviso && <div className="rounded-xl bg-accent-soft px-4 py-2 text-sm text-accent print:hidden">{aviso}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4 print:hidden">
          <div className="card space-y-3">
            <div className="label">Gerar paleta com IA</div>
            <textarea className="input min-h-20" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: sala aconchegante, japandi, madeira clara, luz natural, toque de verde" />
            <button className="btn w-full" onClick={gerarPaleta} disabled={gerando}>{gerando ? "Gerando…" : "✦ Gerar paleta"}</button>
          </div>
          <div className="card space-y-3">
            <div className="label">Adicionar cor manualmente</div>
            <div className="flex gap-2">
              <input type="color" className="h-10 w-12 rounded-lg" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} />
              <input className="input" placeholder="Nome (ex.: Terracota)" value={nomeCor} onChange={(e) => setNomeCor(e.target.value)} />
            </div>
            <button
              className="btn-ghost w-full"
              onClick={() => {
                setBoard((b) => ({ ...b, cores: [...b.cores, { hex: novaCor, nome: nomeCor || novaCor }] }));
                setNomeCor("");
              }}
            >
              + Adicionar cor
            </button>
          </div>
          <div className="card space-y-3">
            <div className="label">Imagens de referência</div>
            <label className="btn-ghost w-full cursor-pointer">
              📷 Enviar imagens
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => adicionarImagens(e.target.files)} />
            </label>
            <p className="text-xs text-muted">As imagens são reduzidas para caber no armazenamento do navegador.</p>
          </div>
        </div>

        <div className="card space-y-5">
          <input
            className="w-full bg-transparent font-serif text-2xl outline-none"
            value={projeto ? projeto.nome : "Meu moodboard"}
            readOnly
          />
          <div className="flex flex-wrap gap-3">
            {board.cores.length === 0 && <p className="text-sm text-muted">Sem cores ainda.</p>}
            {board.cores.map((c, i) => (
              <div key={i} className="group relative w-24 text-center">
                <div className="h-24 w-24 rounded-xl border border-line" style={{ background: c.hex }} />
                <div className="mt-1 text-xs font-medium">{c.nome}</div>
                <div className="text-[10px] uppercase text-muted">{c.hex}</div>
                <button className="absolute right-1 top-1 hidden rounded-full bg-white/90 px-1.5 text-xs text-danger group-hover:block print:hidden" onClick={() => setBoard((b) => ({ ...b, cores: b.cores.filter((_, k) => k !== i) }))}>✕</button>
              </div>
            ))}
          </div>
          <div className="columns-2 gap-3 sm:columns-3">
            {board.imagens.map((src, i) => (
              <div key={i} className="group relative mb-3 break-inside-avoid">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full rounded-xl" />
                <button className="absolute right-2 top-2 hidden rounded-full bg-white/90 px-2 text-xs text-danger group-hover:block print:hidden" onClick={() => setBoard((b) => ({ ...b, imagens: b.imagens.filter((_, k) => k !== i) }))}>✕</button>
              </div>
            ))}
          </div>
          <div>
            <div className="label">Conceito</div>
            <textarea className="input min-h-24" value={board.notas} onChange={(e) => setBoard({ ...board, notas: e.target.value })} placeholder="Descreva o conceito, materiais e sensações que o projeto deve transmitir…" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaginaMoodboard() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
