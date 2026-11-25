"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { reduzirImagem, useProjetos } from "@/lib/store";
import { brl, descreverAbertura, totalItens } from "@/lib/types";

interface Mensagem {
  role: "user" | "assistant";
  texto: string;
  imagem?: string;
}

const SUGESTOES = [
  "Qual a altura ideal para pendentes sobre a mesa de jantar?",
  "Como deixar uma sala pequena parecer maior?",
  "Monte um roteiro de briefing para a primeira reunião com o cliente.",
  "Quais revestimentos são bons para banheiro com pouca ventilação?",
];

export default function Consultor() {
  const { projetos } = useProjetos();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [projetoId, setProjetoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  function contextoDoProjeto() {
    const p = projetos.find((x) => x.id === projetoId);
    if (!p) return "";
    const listaItens = (ambId?: string) =>
      p.itens
        .filter((i) => i.ambienteId === ambId)
        .map((i) => `  - ${i.nome} (${i.quantidade}x ${brl(i.preco)})`)
        .join("\n");
    const ambientes = p.ambientes.map((a) => {
      const planta = a.planta
        ? `\n  Planta: ${a.planta.largura} x ${a.planta.comprimento} m. Móveis: ${a.planta.moveis.map((m) => `${m.nome} ${m.w}x${m.h}m em (${m.x}, ${m.y})`).join("; ") || "nenhum"}` +
          `\n  Portas e janelas: ${(a.planta.aberturas ?? []).map(descreverAbertura).join("; ") || "não marcadas"}`
        : "";
      const itens = listaItens(a.id);
      return `### ${a.nome} (${a.tipo})${planta}${itens ? `\n  Itens:\n${itens}` : ""}`;
    });
    const gerais = listaItens(undefined);
    return [
      `Projeto: ${p.nome}`,
      `Cliente: ${p.cliente}`,
      `Estilo: ${p.estilo}`,
      `Orçamento total: ${brl(p.orcamento)} | Já especificado: ${brl(totalItens(p))}`,
      p.notas ? `Briefing: ${p.notas}` : "",
      `Ambientes (${p.ambientes.length}):`,
      ...ambientes,
      gerais ? `Itens gerais (sem ambiente):\n${gerais}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function enviar(conteudo = texto) {
    if ((!conteudo.trim() && !imagem) || enviando) return;
    const nova: Mensagem = { role: "user", texto: conteudo.trim(), imagem: imagem ?? undefined };
    const historico = [...mensagens, nova];
    setMensagens([...historico, { role: "assistant", texto: "" }]);
    setTexto("");
    setImagem(null);
    setEnviando(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico, contexto: contextoDoProjeto() }),
      });
      if (!r.ok || !r.body) throw new Error((await r.json().catch(() => null))?.erro ?? "Falha ao falar com a IA");
      const leitor = r.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        setMensagens([...historico, { role: "assistant", texto: acumulado }]);
      }
    } catch (e) {
      setMensagens([...historico, { role: "assistant", texto: `⚠️ ${e instanceof Error ? e.message : "Erro"}` }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Consultor IA</h1>
          <p className="text-sm text-muted">Pergunte sobre decoração, materiais, medidas, iluminação ou peça ajuda com o cliente. Pode enviar fotos.</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-56" value={projetoId} onChange={(e) => setProjetoId(e.target.value)} title="A IA vai considerar os dados deste projeto">
            <option value="">Sem projeto vinculado</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>📁 {p.nome}</option>)}
          </select>
          {mensagens.length > 0 && <button className="btn-ghost" onClick={() => setMensagens([])}>Nova conversa</button>}
        </div>
      </div>

      <div className="card flex-1 space-y-4 overflow-y-auto">
        {mensagens.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Comece com uma destas perguntas:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGESTOES.map((s) => (
                <button key={s} className="rounded-xl border border-line p-3 text-left text-sm hover:border-accent" onClick={() => enviar(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-accent text-white" : "bg-bg"}`}>
              {m.imagem && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imagem} alt="" className="mb-2 max-h-48 rounded-lg" />
              )}
              {m.role === "assistant" ? (
                m.texto ? <Markdown texto={m.texto} /> : <span className="animate-pulse text-sm text-muted">pensando…</span>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{m.texto}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <label className="btn-ghost cursor-pointer px-3" title="Anexar foto">
          📷
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImagem(await reduzirImagem(f, 1568, 0.85)); }} />
        </label>
        <div className="flex-1">
          {imagem && (
            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagem} alt="" className="h-10 rounded" /> foto anexada
              <button type="button" className="underline" onClick={() => setImagem(null)}>remover</button>
            </div>
          )}
          <textarea
            className="input min-h-11 resize-none"
            rows={1}
            value={texto}
            placeholder="Escreva sua pergunta…"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
          />
        </div>
        <button className="btn" type="submit" disabled={enviando}>{enviando ? "…" : "Enviar"}</button>
      </form>
    </div>
  );
}
