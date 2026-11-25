"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import PlantaSvg from "@/components/PlantaSvg";
import SeletorAmbientes from "@/components/SeletorAmbientes";
import { useProjetos } from "@/lib/store";
import {
  ESTILOS,
  STATUS_LABEL,
  brl,
  novoId,
  totalAmbiente,
  totalItens,
  type Ambiente,
  type Item,
  type Projeto,
  type StatusProjeto,
} from "@/lib/types";

const CATEGORIAS = ["Móveis", "Iluminação", "Têxteis", "Decoração", "Revestimentos", "Marcenaria", "Mão de obra", "Outros"];
const TODOS = "__todos";
const GERAL = "";

export default function DetalheProjeto() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { projetos, atualizar, remover } = useProjetos();
  const p = projetos.find((x) => x.id === id);
  const [filtro, setFiltro] = useState<string>(TODOS);
  const [novo, setNovo] = useState({ nome: "", categoria: CATEGORIAS[0], fornecedor: "", quantidade: "1", preco: "", link: "", ambienteId: GERAL });

  if (!p) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <p className="mb-4 text-muted">Projeto não encontrado.</p>
        <Link className="btn" href="/projetos">Voltar aos projetos</Link>
      </div>
    );
  }

  const mudar = (campos: Partial<Projeto>) => atualizar(p.id, (x) => ({ ...x, ...campos }));
  const mudarItem = (itemId: string, campos: Partial<Item>) =>
    atualizar(p.id, (x) => ({ ...x, itens: x.itens.map((i) => (i.id === itemId ? { ...i, ...campos } : i)) }));

  function mudarAmbientes(lista: Ambiente[]) {
    const ids = new Set(lista.map((a) => a.id));
    // itens de um ambiente removido passam para "Geral"
    atualizar(p!.id, (x) => ({
      ...x,
      ambientes: lista,
      itens: x.itens.map((i) => (i.ambienteId && !ids.has(i.ambienteId) ? { ...i, ambienteId: undefined } : i)),
    }));
    if (filtro !== TODOS && filtro !== GERAL && !ids.has(filtro)) setFiltro(TODOS);
  }

  function adicionarItem(e: React.FormEvent) {
    e.preventDefault();
    if (!novo.nome.trim()) return;
    const ambienteId = filtro !== TODOS ? filtro : novo.ambienteId;
    const item: Item = {
      id: novoId(),
      nome: novo.nome.trim(),
      categoria: novo.categoria,
      fornecedor: novo.fornecedor,
      quantidade: Number(novo.quantidade) || 1,
      preco: Number(novo.preco) || 0,
      link: novo.link,
      comprado: false,
      ambienteId: ambienteId || undefined,
    };
    atualizar(id, (x) => ({ ...x, itens: [...x.itens, item] }));
    setNovo({ ...novo, nome: "", fornecedor: "", quantidade: "1", preco: "", link: "" });
  }

  const total = totalItens(p);
  const comprado = p.itens.filter((i) => i.comprado).reduce((s, i) => s + i.preco * i.quantidade, 0);
  const saldo = p.orcamento - total;
  const itensVisiveis = filtro === TODOS ? p.itens : p.itens.filter((i) => (i.ambienteId ?? GERAL) === filtro);
  const temGeral = p.itens.some((i) => !i.ambienteId);
  const nomeAmbiente = (ambId?: string) => p.ambientes.find((a) => a.id === ambId)?.nome ?? "Geral";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/projetos" className="text-sm text-muted hover:text-accent">← Projetos</Link>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => window.print()}>Imprimir proposta</button>
          <button
            className="btn-ghost text-danger"
            onClick={() => {
              if (confirm(`Excluir o projeto "${p.nome}"? Isso não pode ser desfeito.`)) {
                remover(p.id);
                router.push("/projetos");
              }
            }}
          >
            Excluir
          </button>
        </div>
      </div>

      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label">Projeto</label>
          <input className="input text-lg font-medium" value={p.nome} onChange={(e) => mudar({ nome: e.target.value })} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={p.status} onChange={(e) => mudar({ status: e.target.value as StatusProjeto })}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Prazo</label>
          <input className="input" type="date" value={p.prazo} onChange={(e) => mudar({ prazo: e.target.value })} />
        </div>
        <div>
          <label className="label">Cliente</label>
          <input className="input" value={p.cliente} onChange={(e) => mudar({ cliente: e.target.value })} />
        </div>
        <div>
          <label className="label">Contato</label>
          <input className="input" value={p.contato} onChange={(e) => mudar({ contato: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Estilo</label>
          <select className="input" value={p.estilo} onChange={(e) => mudar({ estilo: e.target.value })}>
            {[...new Set([p.estilo, ...ESTILOS])].map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="label">Briefing e anotações</label>
          <textarea className="input min-h-24" value={p.notas} onChange={(e) => mudar({ notas: e.target.value })} placeholder="Necessidades do cliente, rotina, preferências, restrições…" />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-serif text-xl">Ambientes</h2>
        <div className="print:hidden">
          <SeletorAmbientes
            ambientes={p.ambientes}
            onChange={mudarAmbientes}
            confirmarRemocao={(a) => {
              const n = p.itens.filter((i) => i.ambienteId === a.id).length;
              return confirm(
                `Remover "${a.nome}"?` + (a.planta ? " A planta deste ambiente será apagada." : "") + (n ? ` ${n} item(ns) passarão para "Geral".` : "")
              );
            }}
          />
        </div>
        {p.ambientes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.ambientes.map((a) => {
              const n = p.itens.filter((i) => i.ambienteId === a.id).length;
              return (
                <div key={a.id} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{a.nome}</div>
                      <div className="text-xs text-muted">
                        {n} {n === 1 ? "item" : "itens"} · {brl(totalAmbiente(p, a.id))}
                        {a.planta && ` · ${(a.planta.largura * a.planta.comprimento).toFixed(1)} m²`}
                      </div>
                    </div>
                    <div className="flex gap-1 print:hidden">
                      <button className="rounded-lg px-2 py-1 text-xs hover:bg-accent-soft" onClick={() => setFiltro(a.id)}>Itens</button>
                      <Link href={`/planta?projeto=${p.id}&ambiente=${a.id}`} className="rounded-lg px-2 py-1 text-xs hover:bg-accent-soft">
                        {a.planta ? "Planta" : "+ Planta"}
                      </Link>
                    </div>
                  </div>
                  {a.planta && <PlantaSvg planta={a.planta} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card">
          <div className="label">Orçamento total</div>
          <input className="input text-lg font-semibold" type="number" min="0" value={p.orcamento} onChange={(e) => mudar({ orcamento: Number(e.target.value) || 0 })} />
        </div>
        <div className="card">
          <div className="label">Especificado</div>
          <div className="text-2xl font-semibold">{brl(total)}</div>
        </div>
        <div className="card">
          <div className="label">Já comprado</div>
          <div className="text-2xl font-semibold">{brl(comprado)}</div>
        </div>
        <div className="card">
          <div className="label">Saldo</div>
          <div className={`text-2xl font-semibold ${saldo < 0 ? "text-danger" : "text-ok"}`}>{brl(saldo)}</div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-serif text-xl">Lista de compras e orçamento</h2>

        <div className="flex flex-wrap gap-2 print:hidden">
          {[
            { id: TODOS, nome: "Todos", valor: total },
            ...p.ambientes.map((a) => ({ id: a.id, nome: a.nome, valor: totalAmbiente(p, a.id) })),
            ...(temGeral || p.ambientes.length === 0 ? [{ id: GERAL, nome: "Geral", valor: totalAmbiente(p, undefined) }] : []),
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`rounded-full border px-3 py-1 text-sm ${filtro === f.id ? "border-accent bg-accent-soft text-accent" : "border-line hover:border-accent"}`}
            >
              {f.nome} <span className="text-xs opacity-70">{brl(f.valor)}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr className="border-b border-line">
                <th className="py-2 print:hidden">✓</th>
                <th>Item</th>
                <th>Ambiente</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th className="w-16">Qtd</th>
                <th className="w-28">Preço un.</th>
                <th className="text-right">Subtotal</th>
                <th className="print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {itensVisiveis.map((i) => (
                <tr key={i.id} className={`border-b border-line ${i.comprado ? "text-muted" : ""}`}>
                  <td className="py-2 print:hidden">
                    <input type="checkbox" checked={i.comprado} onChange={(e) => mudarItem(i.id, { comprado: e.target.checked })} />
                  </td>
                  <td className="pr-2">
                    <input className="input py-1" value={i.nome} onChange={(e) => mudarItem(i.id, { nome: e.target.value })} />
                    {i.link && <a href={i.link} target="_blank" rel="noreferrer" className="text-xs text-accent underline print:hidden">ver produto</a>}
                  </td>
                  <td className="pr-2">
                    <select className="input py-1 print:hidden" value={i.ambienteId ?? GERAL} onChange={(e) => mudarItem(i.id, { ambienteId: e.target.value || undefined })}>
                      <option value={GERAL}>Geral</option>
                      {p.ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                    <span className="hidden print:inline">{nomeAmbiente(i.ambienteId)}</span>
                  </td>
                  <td className="pr-2">
                    <select className="input py-1" value={i.categoria} onChange={(e) => mudarItem(i.id, { categoria: e.target.value })}>
                      {[...new Set([i.categoria, ...CATEGORIAS])].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="pr-2">
                    <input className="input py-1" value={i.fornecedor} onChange={(e) => mudarItem(i.id, { fornecedor: e.target.value })} />
                  </td>
                  <td className="pr-2">
                    <input className="input py-1" type="number" min="1" value={i.quantidade} onChange={(e) => mudarItem(i.id, { quantidade: Number(e.target.value) || 1 })} />
                  </td>
                  <td className="pr-2">
                    <input className="input py-1" type="number" min="0" value={i.preco} onChange={(e) => mudarItem(i.id, { preco: Number(e.target.value) || 0 })} />
                  </td>
                  <td className="text-right font-medium">{brl(i.preco * i.quantidade)}</td>
                  <td className="pl-2 text-right print:hidden">
                    <button className="text-danger" title="Remover" onClick={() => atualizar(p.id, (x) => ({ ...x, itens: x.itens.filter((y) => y.id !== i.id) }))}>✕</button>
                  </td>
                </tr>
              ))}
              {itensVisiveis.length === 0 && (
                <tr><td colSpan={9} className="py-4 text-center text-muted">Nenhum item aqui. Adicione abaixo ou use a Análise de ambiente para gerar sugestões.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={adicionarItem} className="grid gap-2 sm:grid-cols-6 print:hidden">
          <input className="input sm:col-span-2" placeholder="Novo item (ex.: Sofá 3 lugares)" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <select className="input" value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
          {filtro === TODOS ? (
            <select className="input" value={novo.ambienteId} onChange={(e) => setNovo({ ...novo, ambienteId: e.target.value })}>
              <option value={GERAL}>Geral</option>
              {p.ambientes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          ) : (
            <div className="input truncate text-muted" title="Ambiente do filtro selecionado">{nomeAmbiente(filtro || undefined)}</div>
          )}
          <input className="input" type="number" min="0" placeholder="Preço R$" value={novo.preco} onChange={(e) => setNovo({ ...novo, preco: e.target.value })} />
          <button className="btn" type="submit">Adicionar</button>
          <input className="input sm:col-span-2" placeholder="Fornecedor" value={novo.fornecedor} onChange={(e) => setNovo({ ...novo, fornecedor: e.target.value })} />
          <input className="input sm:col-span-3" placeholder="Link do produto (opcional)" value={novo.link} onChange={(e) => setNovo({ ...novo, link: e.target.value })} />
          <input className="input" type="number" min="1" placeholder="Qtd" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} />
        </form>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Moodboard do projeto</h2>
          <Link href={`/moodboard?projeto=${p.id}`} className="btn-ghost print:hidden">{p.moodboard ? "Editar" : "Criar"}</Link>
        </div>
        {p.moodboard ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {p.moodboard.cores.map((c) => (
                <div key={c.hex} className="text-center text-xs">
                  <div className="h-12 w-12 rounded-lg border border-line" style={{ background: c.hex }} />
                  {c.nome}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {p.moodboard.imagens.slice(0, 6).map((src, k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={k} src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Nenhum moodboard salvo para este projeto.</p>
        )}
      </div>
    </div>
  );
}
