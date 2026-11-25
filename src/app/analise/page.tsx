"use client";

import { useState } from "react";
import type { ResultadoAnalise } from "@/app/api/analise/route";
import { reduzirImagem, useProjetos } from "@/lib/store";
import { AMBIENTES, ESTILOS, brl, novoAmbiente, novoId, type Item } from "@/lib/types";

const NOVO = "__novo";
const GERAL = "__geral";

export default function Analise() {
  const { projetos, atualizar } = useProjetos();
  const [imagem, setImagem] = useState<string | null>(null);
  const [ambiente, setAmbiente] = useState(AMBIENTES[0]);
  const [estilo, setEstilo] = useState(ESTILOS[0]);
  const [orcamento, setOrcamento] = useState("");
  const [notas, setNotas] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [projetoId, setProjetoId] = useState("");
  const [destino, setDestino] = useState(NOVO);
  const [aviso, setAviso] = useState("");
  const projeto = projetos.find((p) => p.id === projetoId);

  function escolherProjeto(id: string) {
    setProjetoId(id);
    const p = projetos.find((x) => x.id === id);
    // sugere o ambiente do mesmo tipo que foi analisado
    setDestino(p?.ambientes.find((a) => a.tipo === ambiente)?.id ?? NOVO);
  }

  async function escolherFoto(arquivo?: File) {
    if (!arquivo) return;
    setImagem(await reduzirImagem(arquivo, 1568, 0.85));
  }

  async function analisar() {
    setCarregando(true);
    setErro("");
    setResultado(null);
    try {
      const r = await fetch("/api/analise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagem, ambiente, estilo, orcamento: Number(orcamento) || undefined, notas }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro ?? "Falha na análise");
      setResultado(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setCarregando(false);
    }
  }

  function enviarParaProjeto() {
    if (!resultado || !projeto) return;
    const ambientes = [...projeto.ambientes];
    let ambienteId: string | undefined;
    if (destino === NOVO) {
      const a = novoAmbiente(ambiente, ambientes);
      ambientes.push(a);
      ambienteId = a.id;
    } else if (destino !== GERAL) {
      ambienteId = destino;
    }
    const nomeDestino = ambientes.find((a) => a.id === ambienteId)?.nome ?? "Geral";
    const itens: Item[] = resultado.moveis.map((m) => ({
      ambienteId,
      id: novoId(),
      nome: `${m.nome} — ${m.descricao}`,
      categoria: m.categoria,
      fornecedor: "",
      quantidade: 1,
      preco: Math.round(m.precoEstimado),
      link: "",
      comprado: false,
    }));
    atualizar(projeto.id, (p) => ({
      ...p,
      ambientes,
      itens: [...p.itens, ...itens],
      moodboard: {
        imagens: [...(p.moodboard?.imagens ?? []), ...(imagem ? [imagem.length < 400_000 ? imagem : ""] : [])].filter(Boolean),
        notas: p.moodboard?.notas || resultado.resumo,
        cores: resultado.paleta.map((c) => ({ hex: c.hex, nome: c.nome })),
      },
    }));
    if (ambienteId) setDestino(ambienteId);
    setAviso(`Itens adicionados em "${nomeDestino}" e paleta salva no moodboard ✔`);
    setTimeout(() => setAviso(""), 3000);
  }

  const total = resultado?.moveis.reduce((s, m) => s + m.precoEstimado, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="h1">Análise de ambiente</h1>
        <p className="text-sm text-muted">Envie a foto de um cômodo (ou deixe sem foto para um projeto do zero) e receba diagnóstico, paleta, lista de compras e layout.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="card space-y-4 self-start">
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-line p-4 text-center text-sm text-muted hover:border-accent">
            {imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagem} alt="Ambiente" className="mx-auto max-h-64 rounded-lg" />
            ) : (
              <span>📷 Clique para enviar a foto do ambiente</span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
          </label>
          {imagem && <button className="text-xs text-muted underline" onClick={() => setImagem(null)}>remover foto</button>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ambiente</label>
              <select className="input" value={ambiente} onChange={(e) => setAmbiente(e.target.value)}>
                {AMBIENTES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estilo</label>
              <select className="input" value={estilo} onChange={(e) => setEstilo(e.target.value)}>
                {ESTILOS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Orçamento (R$, opcional)</label>
            <input className="input" type="number" min="0" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input min-h-20" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ex.: casal com 2 gatos, quer mais lugares para receber, manter o piso…" />
          </div>
          <button className="btn w-full" onClick={analisar} disabled={carregando}>
            {carregando ? "Analisando… (pode levar até 1 minuto)" : "✦ Analisar com IA"}
          </button>
          {erro && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{erro}</div>}
        </div>

        <div className="space-y-4">
          {!resultado && !carregando && (
            <div className="card text-sm text-muted">O resultado aparecerá aqui.</div>
          )}
          {carregando && (
            <div className="card animate-pulse text-sm text-muted">A IA está estudando o ambiente, montando a paleta e a lista de compras…</div>
          )}
          {resultado && (
            <>
              <div className="card flex flex-wrap items-center gap-2">
                <select className="input w-60" value={projetoId} onChange={(e) => escolherProjeto(e.target.value)}>
                  <option value="">Escolha um projeto…</option>
                  {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                {projeto && (
                  <select className="input w-60" value={destino} onChange={(e) => setDestino(e.target.value)}>
                    {projeto.ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    <option value={NOVO}>+ Criar ambiente “{ambiente}”</option>
                    <option value={GERAL}>Geral (sem ambiente)</option>
                  </select>
                )}
                <button className="btn" disabled={!projetoId} onClick={enviarParaProjeto}>Adicionar ao projeto</button>
                {aviso && <span className="text-sm text-ok">{aviso}</span>}
              </div>

              <div className="card space-y-3">
                <h2 className="font-serif text-xl">Diagnóstico</h2>
                <p className="text-sm">{resultado.resumo}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="label">Pontos fortes</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm">{resultado.pontosFortes.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                  <div>
                    <div className="label">Melhorias</div>
                    <ul className="list-disc space-y-1 pl-5 text-sm">{resultado.melhorias.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                </div>
              </div>

              <div className="card space-y-3">
                <h2 className="font-serif text-xl">Paleta de cores</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {resultado.paleta.map((c) => (
                    <div key={c.hex + c.nome} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 rounded-lg border border-line" style={{ background: c.hex }} />
                      <div className="text-sm">
                        <div className="font-medium">{c.nome}</div>
                        <div className="text-xs text-muted">{c.hex} · {c.uso}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-serif text-xl">Lista de compras sugerida</h2>
                  <span className="text-sm text-muted">Total estimado: <b className="text-ink">{brl(total)}</b></span>
                </div>
                <ul className="divide-y divide-line text-sm">
                  {resultado.moveis.map((m, i) => (
                    <li key={i} className="flex justify-between gap-4 py-2">
                      <span>
                        <span className="font-medium">{m.nome}</span>{" "}
                        <span className="text-xs text-muted">({m.categoria})</span>
                        <div className="text-muted">{m.descricao}</div>
                      </span>
                      <span className="shrink-0 font-medium">{brl(m.precoEstimado)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="card space-y-2">
                  <h2 className="font-serif text-xl">Iluminação</h2>
                  <ul className="list-disc space-y-1 pl-5 text-sm">{resultado.iluminacao.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
                <div className="card space-y-2">
                  <h2 className="font-serif text-xl">Layout</h2>
                  <p className="text-sm">{resultado.layout}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
